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
    const text = `${entry.headline} ${entry.what_happened} ${entry.why_it_matters}`;
    return sum + text.trim().split(/\s+/).filter(Boolean).length;
  }, 0);
  return Math.max(1, Math.round(words / 200));
}

export { formatDate, estimateReadingMinutes };
