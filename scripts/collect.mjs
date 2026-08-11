// Pulls the last 24h of relevant items from Hacker News + Product Hunt
// and writes them to output/raw.json for the summarize step to consume.

import { writeFile, mkdir } from "fs/promises";
import "dotenv/config";

const NICHE_KEYWORDS = ["AI", "LLM", "agent", "developer tool"]; // tune this to your niche

async function fetchHN() {
  // HN Algolia search API — no key required.
  // Note: the API's `query` param does plain-text/AND matching, not boolean
  // OR, so each keyword has to be searched separately and merged.
  const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

  const results = await Promise.all(
    NICHE_KEYWORDS.map(async (keyword) => {
      const query = encodeURIComponent(keyword);
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=story&numericFilters=created_at_i>${since}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HN fetch failed: ${res.status}`);
      const data = await res.json();
      return data.hits;
    })
  );

  const seen = new Set();
  const hits = [];
  for (const hit of results.flat()) {
    if (seen.has(hit.objectID)) continue;
    seen.add(hit.objectID);
    hits.push(hit);
  }

  return hits.map((hit) => ({
    source: "hackernews",
    title: hit.title,
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    points: hit.points,
    comments: hit.num_comments,
  }));
}

async function fetchProductHunt() {
  if (!process.env.PRODUCTHUNT_TOKEN) {
    console.warn("No PRODUCTHUNT_TOKEN set — skipping Product Hunt for now.");
    return [];
  }

  const query = `
    query {
      posts(first: 20, order: RANKING) {
        edges {
          node {
            name
            tagline
            url
            votesCount
            topics(first: 5) { edges { node { name } } }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PRODUCTHUNT_TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`Product Hunt fetch failed: ${res.status}`);
  const data = await res.json();

  return data.data.posts.edges.map(({ node }) => ({
    source: "producthunt",
    title: node.name,
    tagline: node.tagline,
    url: node.url,
    votes: node.votesCount,
    topics: node.topics.edges.map((t) => t.node.name),
  }));
}

async function main() {
  await mkdir("output", { recursive: true });

  const [hn, ph] = await Promise.all([
    fetchHN().catch((e) => {
      console.error("HN error:", e.message);
      return [];
    }),
    fetchProductHunt().catch((e) => {
      console.error("Product Hunt error:", e.message);
      return [];
    }),
  ]);

  const raw = { collectedAt: new Date().toISOString(), items: [...hn, ...ph] };
  await writeFile("output/raw.json", JSON.stringify(raw, null, 2));
  console.log(`Collected ${raw.items.length} items → output/raw.json`);
  return raw;
}

// Allow running standalone (`node scripts/collect.mjs`) or importing main()
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
