// Pulls the last 24h of AI-related items from the sources listed in
// config/sources.json and writes them to output/raw.json for the
// summarize step to consume.

import { writeFile, mkdir, readFile } from "fs/promises";
import Parser from "rss-parser";
import "dotenv/config";

const CONFIG_PATH = new URL("../config/sources.json", import.meta.url);
const LOOKBACK_HOURS = 24;

const parser = new Parser();

// rss-parser's own HTTP layer leaves keep-alive sockets open, which stops
// Node exiting — the daily job would hang instead of finishing. Fetching the
// XML ourselves and only using the parser for parsing avoids that entirely.
async function fetchFeedXml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "LaunchRadar/1.0 (+daily briefing)" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function loadConfig() {
  return JSON.parse(await readFile(CONFIG_PATH, "utf-8"));
}

// rss-parser's contentSnippet can drop the meaningful text (on Product Hunt
// it returns only the "Discussion | Link" footer, losing the tagline), so
// derive the description from the raw HTML content instead.
function describeEntry(entry) {
  const html = entry.content ?? entry.contentSnippet ?? "";
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Strip the trailing feed boilerplate some sources append to every item.
  return text.replace(/\s*Discussion\s*\|\s*Link\s*$/i, "").trim();
}

// Matches on word boundaries so "ai" doesn't match "said" or "email".
function looksAIRelated(text, keywords) {
  if (!text) return false;
  const haystack = text.toLowerCase();
  return keywords.some((kw) => {
    const escaped = kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
  });
}

async function fetchHN(config) {
  const hn = config.hackernews;
  if (!hn?.enabled) return [];

  // The HN Algolia API's `query` does plain-text/AND matching, not boolean
  // OR, so each term has to be searched separately and merged.
  const since = Math.floor(Date.now() / 1000) - LOOKBACK_HOURS * 60 * 60;

  const results = await Promise.all(
    hn.searchTerms.map(async (term) => {
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(
        term
      )}&tags=story&numericFilters=created_at_i>${since}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HN fetch failed: ${res.status}`);
      return (await res.json()).hits;
    })
  );

  const seen = new Set();
  const items = [];
  for (const hit of results.flat()) {
    if (seen.has(hit.objectID)) continue;
    seen.add(hit.objectID);

    if ((hit.points ?? 0) < (hn.minPoints ?? 0)) continue;
    if (hn.filterForAI && !looksAIRelated(hit.title, config.aiKeywords)) continue;

    items.push({
      source: "Hacker News",
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      points: hit.points,
      comments: hit.num_comments,
      publishedAt: new Date(hit.created_at_i * 1000).toISOString(),
    });
  }
  return items;
}

async function fetchFeed(feed, config) {
  const parsed = await parser.parseString(await fetchFeedXml(feed.url));
  const cutoff = Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000;

  const items = [];
  for (const entry of parsed.items ?? []) {
    const published = entry.isoDate ?? entry.pubDate;
    const publishedMs = published ? new Date(published).getTime() : NaN;

    // Undated items are kept — some feeds omit dates, and dropping them
    // would silently lose the whole source.
    if (!isNaN(publishedMs) && publishedMs < cutoff) continue;

    const description = describeEntry(entry);
    const haystack = `${entry.title ?? ""} ${description}`;
    if (feed.filterForAI && !looksAIRelated(haystack, config.aiKeywords)) continue;

    items.push({
      source: feed.name,
      title: entry.title,
      url: entry.link,
      summary: description.slice(0, 400) || undefined,
      publishedAt: isNaN(publishedMs) ? null : new Date(publishedMs).toISOString(),
    });
  }
  return items;
}

async function main() {
  await mkdir("output", { recursive: true });
  const config = await loadConfig();

  const tasks = [
    { name: "Hacker News", run: () => fetchHN(config) },
    ...config.feeds.map((feed) => ({
      name: feed.name,
      run: () => fetchFeed(feed, config),
    })),
  ];

  // One broken feed shouldn't kill the whole morning's briefing.
  const settled = await Promise.all(
    tasks.map(async ({ name, run }) => {
      try {
        const items = await run();
        console.log(`  ${name}: ${items.length} items`);
        return items;
      } catch (e) {
        console.warn(`  ${name}: FAILED — ${e.message}`);
        return [];
      }
    })
  );

  // Same story often appears in several feeds; keep the first occurrence.
  const seenUrls = new Set();
  const items = [];
  for (const item of settled.flat()) {
    if (!item.url || seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);
    items.push(item);
  }

  const raw = { collectedAt: new Date().toISOString(), items };
  await writeFile("output/raw.json", JSON.stringify(raw, null, 2));
  console.log(`Collected ${items.length} items from ${tasks.length} sources → output/raw.json`);
  return raw;
}

// Allow running standalone (`node scripts/collect.mjs`) or importing main().
// pathToFileURL matters on Windows, where argv[1] is a drive path, not a URL;
// argv[1] is undefined when the module is imported without a script path.
if (process.argv[1] && import.meta.url === (await import("url")).pathToFileURL(process.argv[1]).href) {
  main();
}

export { main };
