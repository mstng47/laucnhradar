// Sends raw.json to Claude, gets back a ranked + summarized digest,
// writes output/latest.json.

import { readFile, writeFile } from "fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You curate a daily digest called LaunchRadar for developers who want to
track new AI tools without browsing Product Hunt and Hacker News themselves.

Given a JSON list of raw items, do the following:
1. Discard anything not actually about a new AI tool, model, or dev-focused launch.
2. Rank what's left by how interesting/useful it would be to a developer audience.
3. Return the top 8 items maximum.
4. For each, write a 1-2 sentence summary in your own words (never copy the title/tagline verbatim)
   explaining what it is and why it matters.

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"title": "...", "url": "...", "summary": "...", "source": "..."}]`;

async function summarize(rawItems) {
  const message = await anthropic.messages.create({
    // Haiku is fast and cheap — good fit for a daily summarization job like this.
    // Swap to "claude-sonnet-5" if you want higher-quality summaries and don't mind the cost.
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
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
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.warn("No SUPABASE_URL/SUPABASE_KEY set — skipping Supabase write.");
    return;
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  const rows = output.entries.map((entry) => ({
    digest_date: output.date,
    title: entry.title,
    url: entry.url,
    summary: entry.summary,
    source: entry.source,
  }));

  const { error } = await supabase
    .from("digest_entries")
    .upsert(rows, { onConflict: "digest_date,url" });

  if (error) throw new Error(`Supabase write failed: ${error.message}`);
  console.log(`Saved ${rows.length} entries → Supabase (digest_entries)`);
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
