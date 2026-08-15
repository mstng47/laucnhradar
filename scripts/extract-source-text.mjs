// Fetches a URL and extracts its readable text, for anything that needs the
// substance of a linked source rather than just its page — currently just
// deep-dive generation (see deep-dive.mjs). Handles the two shapes sources
// in this pipeline actually take: HTML articles and PDF reports/whitepapers.
// Best-effort: a paywall, bot block, timeout, or unsupported content type
// just returns null rather than throwing.

import pdfParse from "pdf-parse";

const FETCH_TIMEOUT_MS = 25000;

function extractReadableTextFromHtml(html) {
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

async function extractSourceText(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LaunchRadar/1.0 (+daily briefing)" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    const looksLikePdf =
      contentType.includes("application/pdf") || url.toLowerCase().split(/[?#]/)[0].endsWith(".pdf");

    if (looksLikePdf) {
      const buffer = Buffer.from(await res.arrayBuffer());
      const parsed = await pdfParse(buffer);
      const text = parsed.text.replace(/\s+/g, " ").trim();
      if (!text) return null;
      return { text, kind: "pdf", pageCount: parsed.numpages };
    }

    if (contentType.includes("text/html")) {
      const html = await res.text();
      const text = extractReadableTextFromHtml(html);
      if (!text) return null;
      return { text, kind: "html" };
    }

    return null;
  } catch {
    // Timeout, network error, blocked request, malformed PDF, etc.
    return null;
  }
}

export { extractSourceText };
