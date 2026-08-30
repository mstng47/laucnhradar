// Sends raw.json to Claude once per active reader profile (see
// scripts/profiles/index.json), getting back a personalized briefing for
// each one and writing output/latest.<slug>.json per profile.

// Must load first — deep-dive.mjs reads ANTHROPIC_API_KEY when it's
// imported (to construct its own Anthropic client), which happens before
// any of this file's own top-level code runs. Importing dotenv/config
// after that point would leave it looking at an unset key when run locally
// off a .env file (GitHub Actions is unaffected — it sets real env vars
// before Node starts).
import "dotenv/config";

import { readFile, writeFile } from "fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { estimateArticleReadingMinutes } from "./article-reading-time.mjs";
import { generateDeepDive } from "./deep-dive.mjs";
import { loadActiveProfiles } from "./lib/profiles.mjs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RECENT_COVERAGE_DAYS = 14;

// The prompt already asks for these limits, but asking is not enforcing —
// on 2026-08-13 the model returned 12/10/6 against a 5/5/3 target (28
// items, a claimed 6-minute read on a product meant for under two). These
// caps are the actual backstop; see flattenSections.
//
// main is 8, not 5: the website only shows the first 5 by default and
// reveals items 6-8 behind a "load more" button (see BriefingList.jsx),
// so the two-minute default read is unaffected — this cap just allows a
// deeper pool to exist for whoever asks for it, on days that genuinely
// have that much worth including.
const SECTION_CAPS = { main: 8, launch: 5, also: 3 };

function buildSystemPrompt(readerProfile, recentCoverage) {
  const recentCoverageSection =
    recentCoverage.length > 0
      ? `
ALREADY COVERED (last ${RECENT_COVERAGE_DAYS} days) — do not repeat these:
${recentCoverage.map((e) => `- ${e.headline} — ${e.url}`).join("\n")}

- Exclude any candidate whose URL exactly matches one above.
- Also exclude any candidate that's substantially the same story as one
  above, even from a different outlet with a different URL — judge by
  whether a reader who saw the earlier item would find this one redundant.
- Exception: if a story has genuinely developed since it was covered, it
  may appear again ONLY if the development itself is the news. Cover just
  what's new — don't rehash the original angle.
`
      : "";

  return `You are writing a daily AI briefing for one specific reader.

READER PROFILE:
${readerProfile}
${recentCoverageSection}
Organize your selections into three sections. These are hard maximums, not
targets — the site shows the first 5 "main" items and all of "launches"/
"also" by default in under two minutes before work, and every extra item
past these limits makes that fail:

1. "main" — AT MOST 8 items, and normally 3-5. The most important AI
   developments today, specifically relevant to this reader. Full detail
   for every item, not just the first few. Order matters: put your
   single strongest item first, in descending order of importance — the
   site shows only your first 5 by default, and items 6-8 only if the
   reader explicitly asks for more, so a weak item buried at position 3
   still costs the default read even if position 8 never gets seen.
   Only go past 5 if there's genuinely a 6th, 7th or 8th story that
   clears the same bar as the rest — never pad to reach 8, and never
   hold back a strong 4th or 5th item just to save it for "more".
   Prefer things that change what they should know or do over things
   that are merely interesting. NEVER return more than 8.
2. "launches" — AT MOST 5 items. Newly launched AI tools or products,
   primarily sourced from Product Hunt items in the list below (a genuine
   launch from another source counts too). ONE LINE each — just the product
   name and what it does. These are quick scans, not reads: no analysis, no
   "why it matters", no defined terms. NEVER return more than 5.
3. "also" — AT MOST 3 items, normally 2-3. Other items worth a passing
   mention but that don't justify full treatment. ONE LINE each — a
   headline and a single-sentence summary. NEVER return more than 3.

If more than the maximum are genuinely worth including, cut to the
strongest ones by this rule's own limit — do not exceed it under any
circumstance. Leave a section out entirely (empty array) if there isn't
genuinely good material for it that day. Never pad to hit a target count —
an honest short section (or no section) beats a padded one.

For "main" items, write:
- headline: plain English, no jargon, max 10 words
- what_happened: one sentence, as if explaining to a smart friend who doesn't work in tech
- why_it_matters: one sentence, specific to this reader's field and role — not generic importance

For "launches" items, write:
- name: the product's name
- what_it_does: ONE plain-English sentence — what it does, not why it matters

For "also" items, write:
- headline: plain English, max 10 words
- summary: ONE plain-English sentence

Rules:
- Never use jargon without a plain-English explanation in the same sentence
- No hype language ("game-changing", "revolutionary", "massive")
- No em dashes (—) anywhere, in any field. Use a comma, a colon, parentheses,
  or a separate sentence instead.
- No stock AI-newsletter phrasing — "worth watching", "worth keeping an eye
  on", "remains to be seen", "time will tell", "stay tuned", "in today's
  fast-moving landscape", or similar filler. If a sentence could appear in
  any AI news roundup unchanged, rewrite it to say something specific to
  this story instead.
- The whole briefing, all three sections combined, must be readable in about
  two minutes

Respond with ONLY a JSON object, no other text, in this exact shape:
{"main": [{"headline": "...", "url": "...", "source": "...", "what_happened": "...", "why_it_matters": "..."}], "launches": [{"name": "...", "url": "...", "source": "...", "what_it_does": "..."}], "also": [{"headline": "...", "url": "...", "source": "...", "summary": "..."}]}`;
}

// Returns null when Supabase isn't configured, so local runs still work.
function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// The database only stops the exact same URL being saved twice on the same
// day for the same profile — it says nothing about repeats across days.
// This is what feeds the model enough of its own recent output, for THIS
// profile only, to avoid covering the same story again, whether via the
// same link or a different outlet's writeup of it. Scoped to one profile —
// Finn's and Dawood's histories must never leak into each other's runs.
async function loadRecentCoverage(supabase, profileId) {
  if (!supabase) return [];

  const since = new Date(Date.now() - RECENT_COVERAGE_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("digest_entries")
    .select("headline, url")
    .eq("profile_id", profileId)
    .gte("digest_date", since);

  if (error) {
    console.warn(`Couldn't load recent coverage (${error.message}) — continuing without it.`);
    return [];
  }
  return data ?? [];
}

// Claude replies with three separate arrays, shaped for what each section
// actually needs (a launch has no "why it matters"). Flattening them here —
// onto the same headline/what_happened/why_it_matters fields the "main"
// section already uses, just tagged with which section they came from —
// means everything downstream (Supabase writes, reading-time estimation)
// stays a single flat list instead of needing three separate code paths.
function flattenSections(raw) {
  // Cap here, not just in the prompt wording — a "3 to 5" or "up to N" in
  // English is a request, not a constraint the model reliably honours.
  // Slicing is applied to whatever order Claude returned (its own
  // priority ordering), and logged so drift is visible in the run output
  // rather than silently swallowed.
  function capped(list, key, max) {
    if (list.length <= max) return list;
    console.warn(`"${key}" came back with ${list.length} items — keeping the first ${max}.`);
    return list.slice(0, max);
  }

  const rawMain = capped(raw.main ?? [], "main", SECTION_CAPS.main);
  const rawLaunches = capped(raw.launches ?? [], "launches", SECTION_CAPS.launch);
  const rawAlso = capped(raw.also ?? [], "also", SECTION_CAPS.also);

  const main = rawMain.map((e) => ({
    section: "main",
    headline: e.headline,
    url: e.url,
    source: e.source,
    what_happened: e.what_happened,
    why_it_matters: e.why_it_matters,
  }));
  const launches = rawLaunches.map((e) => ({
    section: "launch",
    headline: e.name,
    url: e.url,
    source: e.source,
    what_happened: e.what_it_does,
    why_it_matters: null,
  }));
  const also = rawAlso.map((e) => ({
    section: "also",
    headline: e.headline,
    url: e.url,
    source: e.source,
    what_happened: e.summary,
    why_it_matters: null,
  }));

  // Guard against an occasional malformed item (a missing field from the
  // model) reaching the database as a broken row instead of just being
  // dropped — headline and url are the two fields everything else (the
  // link, the dedup list, the page itself) depends on, and source is a
  // not-null column in digest_entries, so a missing one fails the whole
  // upsert batch rather than just that row.
  const flattened = [...main, ...launches, ...also];
  const valid = flattened.filter((e) => e.headline && e.url && e.source);
  if (valid.length < flattened.length) {
    console.warn(`Dropped ${flattened.length - valid.length} malformed entry/entries from Claude's response.`);
  }
  return valid;
}

async function summarize(rawItems, readerProfile, recentCoverage = []) {
  const message = await anthropic.messages.create({
    // Sonnet for the judgment this job needs: deciding what's genuinely
    // relevant to one reader, and writing it in plain English without jargon.
    model: "claude-sonnet-5",
    // Three sections' worth of fields runs long; 2000 truncated mid-string
    // and surfaced only as a confusing JSON parse error.
    max_tokens: 8000,
    system: buildSystemPrompt(readerProfile, recentCoverage),
    messages: [{ role: "user", content: JSON.stringify(rawItems) }],
  });

  if (message.stop_reason === "max_tokens") {
    throw new Error(
      "Claude's reply hit the max_tokens limit and is incomplete — raise max_tokens in summarize.mjs."
    );
  }

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Strip accidental code fences if the model adds them
  const cleaned = text.replace(/```json|```/g, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Claude did not return valid JSON (${err.message}). First 500 chars:\n${cleaned.slice(0, 500)}`
    );
  }
  return flattenSections(parsed);
}

async function saveToSupabase(supabase, output, profileId) {
  const inCI = process.env.GITHUB_ACTIONS === "true";

  if (!supabase) {
    const message =
      "SUPABASE_URL/SUPABASE_KEY not set — skipping Supabase write. " +
      "Check the secret names match exactly (Settings → Secrets and variables → Actions).";
    if (inCI) {
      // A plain console.warn is easy to miss in a green run — this renders
      // as a visible annotation on the workflow run summary page instead.
      console.log(`::error::${message}`);
      throw new Error(message);
    }
    console.warn(message);
    return;
  }

  const rows = output.entries.map((entry) => ({
    digest_date: output.date,
    profile_id: profileId,
    headline: entry.headline,
    what_happened: entry.what_happened,
    why_it_matters: entry.why_it_matters,
    url: entry.url,
    source: entry.source,
    article_read_minutes: entry.article_read_minutes ?? null,
    section: entry.section,
    deep_dive: entry.deep_dive ?? null,
  }));

  // Uniqueness is (digest_date, url, profile_id) once the Stage 3 migration
  // lands, not (digest_date, url) alone — two profiles can each have their
  // own row for the same story on the same day. This upsert target only
  // works once that migration has actually been applied; see the Stage 3
  // notes for why this ships together with that migration, not before it.
  const { data, error } = await supabase
    .from("digest_entries")
    .upsert(rows, { onConflict: "digest_date,url,profile_id" })
    .select();

  if (error) {
    // Postgrest errors carry more detail than `message` alone — surface all
    // of it so a wrong key type / RLS / schema mismatch is diagnosable from
    // the log instead of a bare "write failed".
    const details = [
      `message=${error.message}`,
      error.code && `code=${error.code}`,
      error.details && `details=${error.details}`,
      error.hint && `hint=${error.hint}`,
    ]
      .filter(Boolean)
      .join(" | ");
    const fullMessage = `Supabase write failed: ${details}`;
    if (inCI) console.log(`::error::${fullMessage}`);
    throw new Error(fullMessage);
  }

  const savedCount = data?.length ?? rows.length;
  const message = `Saved ${savedCount} entries → Supabase (digest_entries, profile_id=${profileId}) for ${output.date}`;
  console.log(message);
  if (inCI) console.log(`::notice::${message}`);
}

// Runs the full pick-and-write step for one profile: loads that profile's
// own recent-coverage history (never another profile's), asks Claude for
// that profile's digest, enriches "main" items with reading time and a
// deep dive written in that profile's voice, and saves everything stamped
// with that profile's id.
async function runForProfile(supabase, profile, rawItems) {
  console.log(`\n--- ${profile.displayName} (${profile.slug}) ---`);

  const recentCoverage = await loadRecentCoverage(supabase, profile.id);
  if (recentCoverage.length > 0) {
    console.log(
      `Recent coverage: excluding ${recentCoverage.length} item(s) from the last ${RECENT_COVERAGE_DAYS} days for ${profile.slug}.`
    );
  }

  const digest = await summarize(rawItems, profile.text, recentCoverage);

  // Best-effort and fully parallel — one slow or blocked article can't hold
  // up the others, and neither reading-time estimation nor deep-dive
  // generation can fail the run (see article-reading-time.mjs and
  // deep-dive.mjs). Only "main" items get either — launches and "also worth
  // knowing" are one-line quick scans, not full articles the reader is
  // being sent to read or might want to expand.
  const mainCount = digest.filter((e) => e.section === "main").length;
  console.log(`Enriching ${mainCount} main item(s) for ${profile.slug} with reading time and a deep dive...`);
  const digestWithReadingTime = await Promise.all(
    digest.map(async (entry) => {
      if (entry.section !== "main") {
        return { ...entry, article_read_minutes: null, deep_dive: null, profile_id: profile.id };
      }
      const [article_read_minutes, deep_dive] = await Promise.all([
        estimateArticleReadingMinutes(entry.url),
        generateDeepDive(entry, profile.text, profile.closingAngle),
      ]);
      return { ...entry, article_read_minutes, deep_dive, profile_id: profile.id };
    })
  );

  const output = {
    date: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    profileSlug: profile.slug,
    profileId: profile.id,
    entries: digestWithReadingTime,
  };

  const outputPath = `output/latest.${profile.slug}.json`;
  await writeFile(outputPath, JSON.stringify(output, null, 2));
  console.log(`Summarized ${digest.length} entries for ${profile.slug} → ${outputPath}`);

  await saveToSupabase(supabase, output, profile.id);

  return output;
}

async function main() {
  const raw = JSON.parse(await readFile("output/raw.json", "utf-8"));

  if (raw.items.length === 0) {
    console.warn("No raw items to summarize — did collect.mjs run first?");
    return;
  }

  const supabase = getSupabase();
  const profiles = await loadActiveProfiles(supabase);

  const outputs = [];
  for (const profile of profiles) {
    outputs.push(await runForProfile(supabase, profile, raw.items));
  }
  return outputs;
}

// Run main() only when executed directly, not when imported.
// pathToFileURL matters on Windows, where argv[1] is a drive path, not a URL;
// argv[1] is undefined when the module is imported without a script path.
if (process.argv[1] && import.meta.url === (await import("url")).pathToFileURL(process.argv[1]).href) {
  main();
}

export { main, summarize, runForProfile };
