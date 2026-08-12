// Estimates how long the ORIGINAL linked article takes to read, by fetching
// the page and counting words in its visible text. Best-effort only — a
// paywall, bot block, timeout, or non-HTML response just means no reading
// time is shown for that item; it never fails the run.

const FETCH_TIMEOUT_MS = 10000;
const WORDS_PER_MINUTE = 225;
// Below this, we likely only grabbed nav/boilerplate (paywall, blocked
// request, JS-rendered page) rather than the real article — showing a
// number from that would be misleading, so it's better to show nothing.
const MIN_WORDS_TO_TRUST = 60;

function extractReadableText(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // Most editorial sites wrap the body copy in <article>; prefer that over
  // the full page (nav, footer, related-links boilerplate) when present.
  const articleMatch = text.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) text = articleMatch[0];

  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function estimateArticleReadingMinutes(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LaunchRadar/1.0 (+daily briefing)" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const html = await res.text();
    const words = extractReadableText(html).split(" ").filter(Boolean).length;
    if (words < MIN_WORDS_TO_TRUST) return null;

    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  } catch {
    // Timeout, network error, blocked request, redirect loop, etc.
    return null;
  }
}

export { estimateArticleReadingMinutes };
