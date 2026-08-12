import { getSupabaseClient } from "../supabase";

const ENTRY_COLUMNS =
  "id, headline, what_happened, why_it_matters, new_terms, url, source, digest_date";

// Entries within a day are numbered in the order the pipeline wrote them.
async function getEntriesForDate(date) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("digest_entries")
    .select(ENTRY_COLUMNS)
    .eq("digest_date", date)
    .order("id", { ascending: true });

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return data ?? [];
}

async function getLatestBriefing() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("digest_entries")
    .select("digest_date")
    .order("digest_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  if (!data) return { date: null, entries: [] };

  return { date: data.digest_date, entries: await getEntriesForDate(data.digest_date) };
}

// One row per past entry is fetched and grouped in JS rather than adding a
// database view — the table is small enough that this stays fast, and it
// keeps the schema untouched.
async function getArchiveDates() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("digest_entries")
    .select("digest_date")
    .order("digest_date", { ascending: false });

  if (error) throw new Error(`Supabase query failed: ${error.message}`);

  const counts = new Map();
  for (const row of data ?? []) {
    counts.set(row.digest_date, (counts.get(row.digest_date) ?? 0) + 1);
  }
  return [...counts.entries()].map(([date, count]) => ({ date, count }));
}

async function getGlossaryTerms() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("glossary_terms")
    .select("id, term, definition")
    .order("term", { ascending: true });

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return data ?? [];
}

export { getEntriesForDate, getLatestBriefing, getArchiveDates, getGlossaryTerms };
