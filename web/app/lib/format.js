// digest_date comes back from Supabase as a plain "YYYY-MM-DD" string with no
// time component — parse it as UTC so the displayed date can't shift by a day
// depending on the reader's timezone.
function formatDate(dateStr, { weekday = "short" } = {}) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-GB", {
    weekday,
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function estimateReadingMinutes(entries) {
  const words = entries.reduce((sum, entry) => {
    // why_it_matters is null for "launch"/"also" entries — the ?? keeps
    // that from literally stringifying to the word "null".
    const text = `${entry.headline} ${entry.what_happened} ${entry.why_it_matters ?? ""}`;
    return sum + text.trim().split(/\s+/).filter(Boolean).length;
  }, 0);
  return Math.max(1, Math.round(words / 200));
}

// Splits a day's flat entry list into the three briefing sections. Older
// rows (or a fresh read before the section column exists — see
// lib/data.js) come back tagged "main", which is the right bucket for them:
// they were written in the old full-detail-only format.
function groupSections(entries) {
  return {
    main: entries.filter((e) => e.section === "main"),
    launches: entries.filter((e) => e.section === "launch"),
    also: entries.filter((e) => e.section === "also"),
  };
}

// New terms are attached per-item (usually only "main" items have any),
// deduped by term across the whole day for the sidebar's "Terms explained
// today" recap — the standalone glossary page is gone, so this is now the
// only place to see a definition without opening the item that used it.
function collectTermsToday(entries) {
  const seen = new Map();
  for (const entry of entries) {
    for (const term of entry.new_terms ?? []) {
      if (!term?.term || !term?.definition) continue;
      const key = term.term.trim().toLowerCase();
      if (!seen.has(key)) seen.set(key, term);
    }
  }
  return [...seen.values()];
}

export { formatDate, estimateReadingMinutes, groupSections, collectTermsToday };
