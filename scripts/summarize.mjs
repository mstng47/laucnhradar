// Sends raw.json to Claude, gets back a personalized briefing for the one
// reader described in reader-profile.md, writes output/latest.json.

import { readFile, writeFile } from "fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { estimateArticleReadingMinutes } from "./article-reading-time.mjs";
import "dotenv/config";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const READER_PROFILE_PATH = new URL("./reader-profile.md", import.meta.url);

async function loadReaderProfile() {
  const raw = await readFile(READER_PROFILE_PATH, "utf-8");
  // Everything above the "---" divider is a note for human editors, not
  // part of the profile itself — strip it before it reaches the prompt.
  const afterDivider = raw.split(/^---$/m)[1];
  return (afterDivider ?? raw).trim();
}

function buildSystemPrompt(readerProfile, knownTerms) {
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

  return `You are writing a daily AI briefing for one specific reader.

READER PROFILE:
${readerProfile}
${knownTermsSection}
From the items below, select ONLY the 3-5 most relevant to this reader.
Ignore everything else — do not try to cover it all. Prefer things that
change what they should know or do over things that are merely interesting.

For each item you select, write:
1. headline: plain English, no jargon, max 10 words
2. what_happened: one sentence, as if explaining to a smart friend who doesn't work in tech
3. why_it_matters: one sentence, specific to this reader's field and role — not generic importance
4. new_terms: any term this reader likely wouldn't know, with a one-line plain
   definition. Omit this key (or use an empty array) if there are none.

Rules:
- Never use jargon without defining it in new_terms
- No hype language ("game-changing", "revolutionary", "massive")
- If fewer than 3 items are genuinely worth this reader's time, return fewer.
  An honest short briefing beats a padded one. Zero items is fine on a slow day.
- Total output must be readable in under 90 seconds

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"headline": "...", "url": "...", "source": "...", "what_happened": "...", "why_it_matters": "...", "new_terms": [{"term": "...", "definition": "..."}]}]`;
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

async function summarize(rawItems, knownTerms = []) {
  const readerProfile = await loadReaderProfile();
  const message = await anthropic.messages.create({
    // Sonnet for the judgment this job needs: deciding what's genuinely
    // relevant to one reader, and writing it in plain English without jargon.
    model: "claude-sonnet-5",
    // Four fields per entry plus term definitions runs long; 2000 truncated
    // mid-string and surfaced only as a confusing JSON parse error.
    max_tokens: 8000,
    system: buildSystemPrompt(readerProfile, knownTerms),
    messages: [
      { role: "user", content: JSON.stringify(rawItems) },
    ],
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
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Claude did not return valid JSON (${err.message}). First 500 chars:\n${cleaned.slice(0, 500)}`
    );
  }
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

  const digest = await summarize(raw.items, knownTerms);

  // Best-effort and fully parallel — one slow or blocked article can't hold
  // up the others, and a failure here never fails the run (see
  // article-reading-time.mjs).
  console.log(`Estimating reading time for ${digest.length} linked article(s)...`);
  const digestWithReadingTime = await Promise.all(
    digest.map(async (entry) => ({
      ...entry,
      article_read_minutes: await estimateArticleReadingMinutes(entry.url),
    }))
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
