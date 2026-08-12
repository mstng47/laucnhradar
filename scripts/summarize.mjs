// Sends raw.json to Claude, gets back a personalized briefing for the one
// reader described in reader-profile.md, writes output/latest.json.

import { readFile, writeFile } from "fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
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

function buildSystemPrompt(readerProfile) {
  return `You are writing a daily AI briefing for one specific reader.

READER PROFILE:
${readerProfile}

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

async function summarize(rawItems) {
  const readerProfile = await loadReaderProfile();
  const message = await anthropic.messages.create({
    // Haiku is fast and cheap — good fit for a daily summarization job like this.
    // Swap to "claude-sonnet-5" if you want higher-quality judgment on relevance/tone and don't mind the cost.
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: buildSystemPrompt(readerProfile),
    messages: [
      { role: "user", content: JSON.stringify(rawItems) },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Strip accidental code fences if the model adds them
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
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

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  const rows = output.entries.map((entry) => ({
    digest_date: output.date,
    headline: entry.headline,
    what_happened: entry.what_happened,
    why_it_matters: entry.why_it_matters,
    new_terms: entry.new_terms ?? null,
    url: entry.url,
    source: entry.source,
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

  const digest = await summarize(raw.items);
  const output = {
    date: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    entries: digest,
  };

  await writeFile("output/latest.json", JSON.stringify(output, null, 2));
  console.log(`Summarized ${digest.length} entries → output/latest.json`);

  await saveToSupabase(output);

  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, summarize };
