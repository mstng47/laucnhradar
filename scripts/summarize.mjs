// Sends raw.json to Claude, gets back a personalized briefing for the one
// reader described in reader-profile.md, writes output/latest.json.

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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const READER_PROFILE_PATH = new URL("./reader-profile.md", import.meta.url);
const RECENT_COVERAGE_DAYS = 14;

// The prompt already asks for these limits, but asking is not enforcing —
// on 2026-08-13 the model returned 12/10/6 against a 5/5/3 target (28
// items, a claimed 6-minute read on a product meant for under two). These
// caps are the actual backstop; see flattenSections.
const SECTION_CAPS = { main: 5, launch: 5, also: 3 };

async function loadReaderProfile() {
  const raw = await readFile(READER_PROFILE_PATH, "utf-8");
  // Everything above the "---" divider is a note for human editors, not
  // part of the profile itself — strip it before it reaches the prompt.
  const afterDivider = raw.split(/^---$/m)[1];
  return (afterDivider ?? raw).trim();
}

function buildSystemPrompt(readerProfile, knownTerms, recentCoverage) {
  const knownTermsSection =
    knownTerms.length > 0
      ? `
TERMS THE READER ALREADY KNOWS:
${knownTerms.map((t) => `- ${t}`).join("\n")}

These have already been explained to this reader in previous briefings. They
already know them. Do NOT define any of these again in new_terms. Only define
terms that are genuinely new to them.
`
      : "";

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
${knownTermsSection}${recentCoverageSection}
Organize your selections into three sections. These are hard maximums, not
targets — this briefing is read in under two minutes before work, and every
extra item past the limit makes that fail:

1. "main" — AT MOST 5 items, and normally 3-5. The most important AI
   developments today, specifically relevant to this reader. Full detail.
   Prefer things that change what they should know or do over things that
   are merely interesting. NEVER return more than 5.
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
- new_terms: any term this reader likely wouldn't know, with a one-line plain
  definition. Omit this key (or use an empty array) if there are none.

For "launches" items, write:
- name: the product's name
- what_it_does: ONE plain-English sentence — what it does, not why it matters

For "also" items, write:
- headline: plain English, max 10 words
- summary: ONE plain-English sentence

Rules:
- Never use jargon without defining it in new_terms (main section only)
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
{"main": [{"headline": "...", "url": "...", "source": "...", "what_happened": "...", "why_it_matters": "...", "new_terms": [{"term": "...", "definition": "..."}]}], "launches": [{"name": "...", "url": "...", "source": "...", "what_it_does": "..."}], "also": [{"headline": "...", "url": "...", "source": "...", "summary": "..."}]}`;
}

// Returns null when Supabase isn't configured, so local runs still work.
function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

async function loadKnownTerms() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.from("glossary_terms").select("term");
  if (error) {
    // A missing glossary table shouldn't stop the briefing going out; the
    // worst case is a term gets explained twice.
    console.warn(`Couldn't load glossary (${error.message}) — continuing without it.`);
    return [];
  }
  return (data ?? []).map((row) => row.term);
}

// The database only stops the exact same URL being saved twice on the same
// day — it says nothing about repeats across days. This is what feeds the
// model enough of its own recent output to avoid covering the same story
// again, whether via the same link or a different outlet's writeup of it.
async function loadRecentCoverage() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const since = new Date(Date.now() - RECENT_COVERAGE_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("digest_entries")
    .select("headline, url")
    .gte("digest_date", since);

  if (error) {
    console.warn(`Couldn't load recent coverage (${error.message}) — continuing without it.`);
    return [];
  }
  return data ?? [];
}

async function saveNewTerms(output) {
  const supabase = getSupabase();
  if (!supabase) return;

  const byKey = new Map();
  for (const entry of output.entries) {
    for (const t of entry.new_terms ?? []) {
      if (!t?.term || !t?.definition) continue;
      const key = t.term.trim().toLowerCase();
      if (!byKey.has(key)) {
        byKey.set(key, {
          term_key: key,
          term: t.term.trim(),
          definition: t.definition.trim(),
          first_seen_date: output.date,
        });
      }
    }
  }
  if (byKey.size === 0) return;

  // ignoreDuplicates keeps the definition the reader first learned, rather
  // than overwriting it with a later rewording of the same term.
  const { error } = await supabase
    .from("glossary_terms")
    .upsert([...byKey.values()], { onConflict: "term_key", ignoreDuplicates: true });

  if (error) {
    console.warn(`Couldn't save new glossary terms (${error.message}).`);
    return;
  }
  console.log(`Glossary: saved up to ${byKey.size} new term(s).`);
}

// Claude replies with three separate arrays, shaped for what each section
// actually needs (a launch has no "why it matters"; "also" has no terms).
// Flattening them here — onto the same headline/what_happened/why_it_matters/
// new_terms fields the "main" section already uses, just tagged with which
// section they came from — means everything downstream (Supabase writes,
// glossary extraction, reading-time estimation) stays a single flat list
// instead of needing three separate code paths.
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
    new_terms: e.new_terms ?? [],
  }));
  const launches = rawLaunches.map((e) => ({
    section: "launch",
    headline: e.name,
    url: e.url,
    source: e.source,
    what_happened: e.what_it_does,
    why_it_matters: null,
    new_terms: [],
  }));
  const also = rawAlso.map((e) => ({
    section: "also",
    headline: e.headline,
    url: e.url,
    source: e.source,
    what_happened: e.summary,
    why_it_matters: null,
    new_terms: [],
  }));

  // Guard against an occasional malformed item (a missing field from the
  // model) reaching the database as a broken row instead of just being
  // dropped — headline and url are the two fields everything else (the
  // link, the dedup list, the page itself) depends on.
  const flattened = [...main, ...launches, ...also];
  const valid = flattened.filter((e) => e.headline && e.url);
  if (valid.length < flattened.length) {
    console.warn(`Dropped ${flattened.length - valid.length} malformed entry/entries from Claude's response.`);
  }
  return valid;
}

async function summarize(rawItems, knownTerms = [], recentCoverage = []) {
  const readerProfile = await loadReaderProfile();
  const message = await anthropic.messages.create({
    // Sonnet for the judgment this job needs: deciding what's genuinely
    // relevant to one reader, and writing it in plain English without jargon.
    model: "claude-sonnet-5",
    // Three sections' worth of fields, plus term definitions, runs long;
    // 2000 truncated mid-string and surfaced only as a confusing JSON parse
    // error.
    max_tokens: 8000,
    system: buildSystemPrompt(readerProfile, knownTerms, recentCoverage),
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

async function saveToSupabase(output) {
  const inCI = process.env.GITHUB_ACTIONS === "true";

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
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

  console.log(
    `Connecting to Supabase at ${process.env.SUPABASE_URL} with a ${process.env.SUPABASE_KEY.length}-char key…`
  );

  const supabase = getSupabase();

  const rows = output.entries.map((entry) => ({
    digest_date: output.date,
    headline: entry.headline,
    what_happened: entry.what_happened,
    why_it_matters: entry.why_it_matters,
    new_terms: entry.new_terms ?? null,
    url: entry.url,
    source: entry.source,
    article_read_minutes: entry.article_read_minutes ?? null,
    section: entry.section,
    deep_dive: entry.deep_dive ?? null,
  }));

  const { data, error } = await supabase
    .from("digest_entries")
    .upsert(rows, { onConflict: "digest_date,url" })
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
  const message = `Saved ${savedCount} entries → Supabase (digest_entries) for ${output.date}`;
  console.log(message);
  if (inCI) console.log(`::notice::${message}`);
}

async function main() {
  const raw = JSON.parse(await readFile("output/raw.json", "utf-8"));

  if (raw.items.length === 0) {
    console.warn("No raw items to summarize — did collect.mjs run first?");
    return;
  }

  const knownTerms = await loadKnownTerms();
  if (knownTerms.length > 0) {
    console.log(`Glossary: reader already knows ${knownTerms.length} term(s).`);
  }

  const recentCoverage = await loadRecentCoverage();
  if (recentCoverage.length > 0) {
    console.log(
      `Recent coverage: excluding ${recentCoverage.length} item(s) from the last ${RECENT_COVERAGE_DAYS} days.`
    );
  }

  const digest = await summarize(raw.items, knownTerms, recentCoverage);

  // Best-effort and fully parallel — one slow or blocked article can't hold
  // up the others, and neither reading-time estimation nor deep-dive
  // generation can fail the run (see article-reading-time.mjs and
  // deep-dive.mjs). Only "main" items get either — launches and "also worth
  // knowing" are one-line quick scans, not full articles the reader is
  // being sent to read or might want to expand.
  const mainCount = digest.filter((e) => e.section === "main").length;
  console.log(`Enriching ${mainCount} main item(s) with reading time and a deep dive...`);
  const readerProfile = await loadReaderProfile();
  const digestWithReadingTime = await Promise.all(
    digest.map(async (entry) => {
      if (entry.section !== "main") {
        return { ...entry, article_read_minutes: null, deep_dive: null };
      }
      const [article_read_minutes, deep_dive] = await Promise.all([
        estimateArticleReadingMinutes(entry.url),
        generateDeepDive(entry, readerProfile),
      ]);
      return { ...entry, article_read_minutes, deep_dive };
    })
  );

  const output = {
    date: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    entries: digestWithReadingTime,
  };

  await writeFile("output/latest.json", JSON.stringify(output, null, 2));
  console.log(`Summarized ${digest.length} entries → output/latest.json`);

  await saveToSupabase(output);
  await saveNewTerms(output);

  return output;
}

// Run main() only when executed directly, not when imported.
// pathToFileURL matters on Windows, where argv[1] is a drive path, not a URL;
// argv[1] is undefined when the module is imported without a script path.
if (process.argv[1] && import.meta.url === (await import("url")).pathToFileURL(process.argv[1]).href) {
  main();
}

export { main, summarize };
