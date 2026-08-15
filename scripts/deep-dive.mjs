// Generates a denser, original-writing expansion of each "What matters
// today" item, so the reader can understand a source without leaving the
// site — including sources they will never read themselves (the 100-page
// PDF case this feature exists for). Depth scales with the source: a short
// piece the reader could read in five minutes gets a couple of tight
// paragraphs; a long report gets the fullest treatment, because that's the
// one where this is the reader's only real exposure to it.
//
// CRITICAL — the model is instructed to write an original synthesis, never
// a copy, quote-heavy summary, or section-by-section walkthrough. This is a
// legal requirement (fair-use synthesis vs. reproduction), not a style
// preference — see buildSystemPrompt below.
//
// Best-effort throughout: a source that can't be fetched falls back to
// writing from the briefing item's own headline/summary alone, careful
// never to claim detail it doesn't have. If even that fails, the entry
// simply gets no deep_dive and the site shows no expand control for it —
// this must never fail the daily run (see summarize.mjs's caller).

import Anthropic from "@anthropic-ai/sdk";
import { extractSourceText } from "./extract-source-text.mjs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WORDS_PER_MINUTE = 225;

// Ceiling on how much extracted source text gets sent to Claude — roughly a
// 200-page report. Reports and whitepapers front-load their key findings
// (executive summary, early sections), so truncating to the first N words
// loses far less than it sounds like, and it keeps the cost of even a
// genuinely huge PDF bounded. Truncation is flagged in the prompt so the
// model doesn't claim knowledge of what got cut.
const MAX_SOURCE_WORDS = 60000;

function pickDepthTier(source) {
  const wordCount = source.text.split(/\s+/).filter(Boolean).length;
  const readingMinutes = wordCount / WORDS_PER_MINUTE;
  const looksLikeReport = source.kind === "pdf" && source.pageCount >= 20;

  if (looksLikeReport || wordCount >= 6000) return "report";
  if (readingMinutes > 5) return "long";
  return "short";
}

const TIER_INSTRUCTIONS = {
  short: `This source is short (under a 5-minute read) — the reader could read it
themselves if they wanted to, so don't duplicate it wholesale. Write 2-3
tight paragraphs that add enough substance to be worth reading on their own.`,
  long: `This source is a longer article or analysis piece. Write 4-6 paragraphs
covering its real substance and the shape of its argument.`,
  report: `This source is a long report, whitepaper, or PDF that the reader will
never read themselves — this is the one place they'll ever encounter its
content, so give it the fullest treatment. Cover the main findings, the
numbers that matter, what's genuinely new, and the practical implications.
Length alone doesn't call for report-style formatting — write this the same
way as the shorter tiers: plain paragraphs and, where genuinely useful, "- "
bullets. No section headers, no bolded lead-in phrases.`,
};

function buildSystemPrompt(readerProfile, tier) {
  return `You are writing a deeper, standalone explanation of one news item for a
daily AI briefing's single reader, so they can understand it without ever
opening the original source.

READER PROFILE:
${readerProfile}

You will be given the short summary already shown to the reader before they
expand this item, plus the extracted text of the original source.

CRITICAL — original writing only, this is a legal requirement:
Write a fresh, original synthesis in your own words. Do NOT copy, quote at
length, or closely paraphrase the source. Do NOT reproduce its structure or
walk through it section by section. Facts (figures, dates, names) are not
copyrighted; wording is — so pull out the facts and rebuild them into your
own sentences, in your own structure, entirely.

${TIER_INSTRUCTIONS[tier]}

VOICE:
- Written for an intelligent businessperson who is not technical.
- Dense and efficient — every sentence carries information. No throat-
  clearing, no restating the headline, no "in today's fast-moving landscape".
- Clear and direct, short paragraphs. A short bulleted list is fine where the
  source has several genuinely distinct findings.
- Explain any term a business reader might not know, naturally, in the
  sentence where it appears.
- Include concrete specifics (figures, dates, names) where they matter, in
  your own sentences.
- End with one short line on what this means specifically for someone
  working in identity and access management (IAM/SAM/IGA).

Respond with ONLY the deep-dive text itself — plain text, paragraphs
separated by a blank line, and "- " at the start of a line for the
occasional bullet. Nothing else: no headline, no preamble, no JSON, no
markdown of any kind — no "**bold**", no "## headers", no asterisks or
underscores for emphasis. This is rendered as plain text, so any markdown
syntax will show up as literal stray characters on the page. Do not announce
what you're about to do ("Here is my synthesis...", "I've reviewed the
source and..."). Start directly with the first sentence of the content
itself.`;
}

function buildFallbackSystemPrompt(readerProfile) {
  return `You are writing a deeper, standalone explanation of one news item for a
daily AI briefing's single reader, but the original source could not be
fetched (paywalled, blocked, or unavailable).

READER PROFILE:
${readerProfile}

You will be given only the short summary already shown to the reader. Write
a slightly denser version of it, in your own words, 2-3 sentences at most.

CRITICAL: do not invent facts, figures, dates, or details beyond what's in
the summary you're given. If you don't know more than the summary already
says, say less — never claim detail you don't actually have.

VOICE: intelligent businessperson, not technical, plain English, dense and
direct. End with one short line on what this means for someone working in
identity and access management (IAM/SAM/IGA).

Respond with ONLY the text itself — no preamble, no JSON, no markdown headers.`;
}

// The prompt asks for plain text, but the model doesn't always comply —
// observed in testing on longer (report-tier) responses, which reach for
// "## Section" headers and "**bold**" the way a written report would. The
// site renders this as plain text with no markdown parser, so anything
// that slips through would show up as literal stray asterisks and hashes.
// Stripped rather than re-prompted for — cheaper and more reliable than a
// retry loop.
function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1");
}

function textFromMessage(message) {
  // A truncated deep dive (cut off mid-sentence) is worse than none — skip
  // it rather than publish a broken response. Thinking is disabled below
  // specifically so max_tokens is spent entirely on visible output and
  // this stays rare, but this is the backstop if it happens anyway.
  if (message.stop_reason === "max_tokens") return null;

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  return text ? stripMarkdown(text) : null;
}

function summaryBlock(entry) {
  return `Headline: ${entry.headline}\nWhat happened: ${entry.what_happened}\nWhy it matters: ${entry.why_it_matters ?? ""}`;
}

async function generateDeepDive(entry, readerProfile) {
  try {
    const source = await extractSourceText(entry.url);

    if (!source) {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 400,
        // This is a short, plain writing task, not one that benefits from
        // multi-step reasoning — disabling thinking keeps the whole
        // max_tokens budget available for the visible output (Sonnet 5
        // runs adaptive thinking by default, and thinking tokens count
        // against the same cap) and keeps cost and latency down.
        thinking: { type: "disabled" },
        system: buildFallbackSystemPrompt(readerProfile),
        messages: [{ role: "user", content: summaryBlock(entry) }],
      });
      return textFromMessage(message);
    }

    const words = source.text.split(/\s+/).filter(Boolean);
    const truncated = words.length > MAX_SOURCE_WORDS;
    const sourceText = truncated ? words.slice(0, MAX_SOURCE_WORDS).join(" ") : source.text;
    const tier = pickDepthTier(source);
    // Generous headroom over the target length in the prompt — Sonnet 5's
    // paragraphs run longer than the word count implies, especially with
    // thinking disabled, and a truncated deep dive is discarded entirely
    // (see textFromMessage), so it's cheaper to over-budget here than to
    // silently lose items. Output tokens are the least expensive part of
    // this call either way.
    const maxTokens = tier === "report" ? 1800 : tier === "long" ? 1200 : 800;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: maxTokens,
      thinking: { type: "disabled" },
      system: buildSystemPrompt(readerProfile, tier),
      messages: [
        {
          role: "user",
          content: `Already-shown summary:\n${summaryBlock(entry)}\n\nExtracted source text${
            truncated ? " (truncated — this is the first part of a much longer document)" : ""
          }:\n${sourceText}`,
        },
      ],
    });
    return textFromMessage(message);
  } catch (err) {
    console.warn(`Deep dive failed for ${entry.url}: ${err.message}`);
    return null;
  }
}

export { generateDeepDive };
