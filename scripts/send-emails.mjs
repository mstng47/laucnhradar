// Runs every 15 minutes via GitHub Actions. Checks every enabled
// subscriber against their own days/time/timezone, sends today's briefing
// to whoever's due right now, and records that they've had this digest so
// the next run (15 minutes later) doesn't send it again.
//
// Multi-profile: each subscriber belongs to a profile (Finn, Dawood, ...)
// and must only ever receive that profile's own digest_entries rows, never
// another profile's. See loadProfiles/loadLatestDigestForProfile below.
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import { isDueNow } from "./lib/localTime.mjs";
import { buildBriefingEmail } from "./lib/emailTemplate.mjs";
import { sendEmail } from "./lib/resendClient.mjs";

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    throw new Error("SUPABASE_URL/SUPABASE_KEY are required to send emails.");
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// True when a query failed because a table/column the multi-profile
// migrations add doesn't exist yet (42P01 = undefined_table, 42703 =
// undefined_column). Lets this script keep working, in single-profile
// "everyone is Finn" mode, against a database those migrations haven't
// been applied to yet — the same "degrade instead of break" pattern
// web/app/lib/data.js already uses for digest_entries' own column history.
function isMissingSchema(error) {
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    /relation .* does not exist/i.test(error.message ?? "") ||
    /column .* does not exist/i.test(error.message ?? "")
  );
}

// Both fallback paths below (loadProfiles, loadLatestDigestForProfile) and
// the per-subscriber default in resolveProfileId funnel through here, so
// every way this script can silently slip into "everyone gets the same
// unfiltered digest" mode is announced the same, unmissable way — a plain
// console.warn for anyone watching locally, plus a GitHub Actions
// ::warning:: annotation (shows up on the run summary page, not just
// buried in the log) when running in CI.
function warnFallback(inCI, message) {
  const full = `Sift multi-profile fallback: ${message}`;
  console.warn(full);
  if (inCI) console.log(`::warning::${full}`);
}

// Returns a Map of slug -> id, or null if the `profiles` table doesn't
// exist yet. null is the signal every caller below uses to fall back to
// the pre-multi-profile behavior: one shared digest, no profile filter.
async function loadProfiles(supabase, inCI) {
  const { data, error } = await supabase.from("profiles").select("id, slug");
  if (error) {
    if (isMissingSchema(error)) {
      warnFallback(
        inCI,
        `the "profiles" table isn't available yet (${error.message}). Falling back to legacy ` +
          "shared-digest mode: every subscriber gets the same unfiltered briefing. Expected before " +
          "the multi-profile migrations are applied — investigate if this appears once multi-profile " +
          "mode is supposed to be live."
      );
      return null;
    }
    throw new Error(`Couldn't load profiles: ${error.message}`);
  }
  return new Map((data ?? []).map((p) => [p.slug, p.id]));
}

// profileId is null in two cases, both meaning "don't filter": the
// profiles table doesn't exist yet, or (defensively) digest_entries turns
// out not to have a profile_id column even though profiles does. Either
// way this reproduces exactly today's single-shared-digest query.
async function loadLatestDigestForProfile(supabase, profileId, inCI) {
  let dateQuery = supabase
    .from("digest_entries")
    .select("digest_date")
    .order("digest_date", { ascending: false })
    .limit(1);
  if (profileId != null) dateQuery = dateQuery.eq("profile_id", profileId);

  let { data: latest, error: dateError } = await dateQuery.maybeSingle();
  if (dateError) {
    if (profileId != null && isMissingSchema(dateError)) {
      warnFallback(
        inCI,
        `digest_entries has no usable profile_id column (${dateError.message}) even though the ` +
          `"profiles" table exists — falling back to legacy shared-digest mode for profile id ` +
          `${profileId}. This looks like a partially applied migration, not an expected state once ` +
          "multi-profile mode is live — investigate."
      );
      return loadLatestDigestForProfile(supabase, null, inCI);
    }
    throw new Error(`Couldn't find latest digest: ${dateError.message}`);
  }
  if (!latest) return null;

  let entriesQuery = supabase
    .from("digest_entries")
    .select("headline, what_happened, why_it_matters, url, source, article_read_minutes, section")
    .eq("digest_date", latest.digest_date);
  if (profileId != null) entriesQuery = entriesQuery.eq("profile_id", profileId);

  const { data: entries, error } = await entriesQuery.order("id", { ascending: true });
  if (error) throw new Error(`Couldn't load digest entries: ${error.message}`);

  return {
    digestDate: latest.digest_date,
    main: entries.filter((e) => e.section === "main"),
    launches: entries.filter((e) => e.section === "launch"),
    also: entries.filter((e) => e.section === "also"),
  };
}

async function loadEnabledSubscribers(supabase) {
  const { data, error } = await supabase.from("email_subscribers").select("*").eq("enabled", true);
  if (error) throw new Error(`Couldn't load subscribers: ${error.message}`);
  return data ?? [];
}

// A subscriber with no profile_id of their own (every subscriber created
// before the multi-profile migrations, and any row created while
// profile_id was still nullable-and-unset) defaults to Finn — never to
// "no filter", once profiles actually exist, so they keep getting exactly
// what they always got even after Dawood starts generating its own rows.
// Once profiles genuinely exist, every subscriber is expected to have their
// own profile_id set — one that doesn't is surfaced by name here rather
// than silently absorbed, since it likely means a signup path (or a manual
// insert) forgot to stamp one.
function resolveProfileId(subscriber, profilesBySlug, finnProfileId, inCI) {
  if (!profilesBySlug) return null;
  if (subscriber.profile_id == null) {
    warnFallback(
      inCI,
      `subscriber ${subscriber.email} (id=${subscriber.id}) has no profile_id — defaulting to Finn` +
        (finnProfileId != null ? ` (profile id ${finnProfileId})` : " (no Finn profile row found either)") +
        ". Expected for subscribers created before multi-profile mode; investigate if this is a new " +
        "signup made after multi-profile mode went live."
    );
  }
  return subscriber.profile_id ?? finnProfileId ?? null;
}

async function main() {
  const inCI = process.env.GITHUB_ACTIONS === "true";
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) throw new Error("SITE_URL is required to build the links inside each email.");

  const supabase = getSupabase();
  const profilesBySlug = await loadProfiles(supabase, inCI);
  const finnProfileId = profilesBySlug?.get("finn") ?? null;

  const subscribers = await loadEnabledSubscribers(supabase);
  if (subscribers.length === 0) {
    console.log("No enabled subscribers.");
    return;
  }

  // One digest fetch per distinct profile among today's subscribers, not
  // per subscriber — cached here and shared by everyone on that profile.
  const digestCache = new Map();
  async function digestForSubscriber(subscriber) {
    const profileId = resolveProfileId(subscriber, profilesBySlug, finnProfileId, inCI);
    const cacheKey = profileId ?? "__unfiltered__";
    if (!digestCache.has(cacheKey)) {
      digestCache.set(cacheKey, await loadLatestDigestForProfile(supabase, profileId, inCI));
    }
    return digestCache.get(cacheKey);
  }

  const now = new Date();
  let due = 0;
  let sent = 0;
  let failed = 0;
  let skippedNoDigest = 0;

  for (const subscriber of subscribers) {
    const digest = await digestForSubscriber(subscriber);
    if (!digest || digest.main.length === 0) {
      skippedNoDigest += 1;
      continue;
    }
    if (!isDueNow(subscriber, now, digest.digestDate)) continue;
    due += 1;

    const { subject, html, text } = buildBriefingEmail({
      subscriber,
      digestDate: digest.digestDate,
      main: digest.main,
      launches: digest.launches,
      also: digest.also,
      siteUrl,
    });

    try {
      await sendEmail({
        to: subscriber.email,
        subject,
        html,
        text,
        unsubscribeUrl: `${siteUrl}/api/unsubscribe?token=${subscriber.manage_token}`,
      });

      // Recorded right after a successful send, before moving to the next
      // subscriber — if this script crashes partway through a batch, the
      // people already sent to don't get emailed twice on retry.
      const { error } = await supabase
        .from("email_subscribers")
        .update({ last_sent_date: digest.digestDate, updated_at: new Date().toISOString() })
        .eq("id", subscriber.id);
      if (error) throw new Error(`Sent but failed to record last_sent_date: ${error.message}`);

      sent += 1;
    } catch (err) {
      failed += 1;
      const message = `Failed to email ${subscriber.email}: ${err.message}`;
      if (inCI) console.log(`::error::${message}`);
      else console.error(message);
    }
  }

  console.log(
    `${subscribers.length} enabled subscriber(s), ${due} due right now` +
      (skippedNoDigest > 0 ? ` (${skippedNoDigest} skipped: no briefing yet for their profile)` : "") +
      "."
  );

  const summary = `Sent ${sent}/${due} due email(s)${failed > 0 ? `, ${failed} failed` : ""}.`;
  console.log(summary);
  if (inCI) console.log(`::notice::${summary}`);

  if (due > 0 && sent === 0 && failed > 0) {
    // Everyone who was due failed — almost certainly a config problem
    // (bad API key, unverified sending domain), not per-subscriber noise.
    // Worth a loud red X rather than a run that quietly did nothing.
    throw new Error(summary);
  }
}

main().catch((err) => {
  console.error("send-emails failed:", err);
  process.exit(1);
});
