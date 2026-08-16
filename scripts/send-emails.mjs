// Runs every 15 minutes via GitHub Actions. Checks every enabled
// subscriber against their own days/time/timezone, sends today's briefing
// to whoever's due right now, and records that they've had this digest so
// the next run (15 minutes later) doesn't send it again.
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

// Same content every subscriber sees on the site that day — delivery time
// is personalized, the briefing itself isn't regenerated per subscriber.
async function loadLatestDigest(supabase) {
  const { data: latest, error: dateError } = await supabase
    .from("digest_entries")
    .select("digest_date")
    .order("digest_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dateError) throw new Error(`Couldn't find latest digest: ${dateError.message}`);
  if (!latest) return null;

  const { data: entries, error } = await supabase
    .from("digest_entries")
    .select("headline, what_happened, why_it_matters, url, source, article_read_minutes, section")
    .eq("digest_date", latest.digest_date)
    .order("id", { ascending: true });
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

async function main() {
  const inCI = process.env.GITHUB_ACTIONS === "true";
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) throw new Error("SITE_URL is required to build the links inside each email.");

  const supabase = getSupabase();

  const digest = await loadLatestDigest(supabase);
  if (!digest || digest.main.length === 0) {
    console.log("No briefing available yet today — nothing to send.");
    return;
  }

  const subscribers = await loadEnabledSubscribers(supabase);
  const now = new Date();
  const due = subscribers.filter((s) => isDueNow(s, now, digest.digestDate));

  console.log(`${subscribers.length} enabled subscriber(s), ${due.length} due right now.`);

  let sent = 0;
  let failed = 0;

  for (const subscriber of due) {
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

  const summary = `Sent ${sent}/${due.length} due email(s)${failed > 0 ? `, ${failed} failed` : ""}.`;
  console.log(summary);
  if (inCI) console.log(`::notice::${summary}`);

  if (due.length > 0 && sent === 0 && failed > 0) {
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
