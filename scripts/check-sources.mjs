// Checks every feed in config/sources.json actually works.
// Run with: npm run check-sources
// Use this after adding a new feed, before trusting it in the daily run.

import { readFile } from "fs/promises";
import Parser from "rss-parser";

const CONFIG_PATH = new URL("../config/sources.json", import.meta.url);
const STALE_AFTER_DAYS = 30;

const parser = new Parser();

// Fetch ourselves rather than via parser.parseURL — see the note in
// collect.mjs; parseURL's sockets stop the process exiting.
async function fetchFeedXml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "LaunchRadar/1.0 (+feed check)" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function check(feed) {
  try {
    const parsed = await parser.parseString(await fetchFeedXml(feed.url));
    const items = parsed.items ?? [];
    if (items.length === 0) return { ...feed, ok: false, why: "feed has no items" };

    const dates = items
      .map((i) => new Date(i.isoDate ?? i.pubDate ?? NaN))
      .filter((d) => !isNaN(d));

    if (dates.length === 0) {
      return { ...feed, ok: true, note: `${items.length} items, but no dates to check freshness` };
    }

    const newestDays = (Date.now() - Math.max(...dates.map((d) => d.getTime()))) / 86400000;
    if (newestDays > STALE_AFTER_DAYS) {
      return { ...feed, ok: false, why: `stale — newest item is ${newestDays.toFixed(0)} days old` };
    }
    return { ...feed, ok: true, note: `${items.length} items, newest ${newestDays.toFixed(1)} days old` };
  } catch (e) {
    return { ...feed, ok: false, why: e.message.slice(0, 100) };
  }
}

const config = JSON.parse(await readFile(CONFIG_PATH, "utf-8"));
const results = await Promise.all(config.feeds.map(check));

for (const r of results) {
  if (r.ok) console.log(`OK    ${r.name} — ${r.note}`);
  else console.log(`BROKEN  ${r.name} — ${r.why}\n        ${r.url}`);
}

const broken = results.filter((r) => !r.ok);
console.log(`\n${results.length - broken.length}/${results.length} feeds working.`);
if (broken.length > 0) {
  console.log("Remove or fix the broken ones in config/sources.json.");
  process.exitCode = 1;
}
