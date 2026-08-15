import { getSupabaseClient } from "../supabase";

const ENTRY_COLUMNS =
  "id, headline, what_happened, why_it_matters, new_terms, url, source, digest_date, article_read_minutes, section, deep_dive";

// Same as ENTRY_COLUMNS minus `deep_dive`, for reading before the migration
// in MANUAL_STEPS.md has been run.
const ENTRY_COLUMNS_WITHOUT_DEEP_DIVE =
  "id, headline, what_happened, why_it_matters, new_terms, url, source, digest_date, article_read_minutes, section";

// Same again minus `section` too, for reading before that earlier migration
// has been run.
const ENTRY_COLUMNS_WITHOUT_SECTION =
  "id, headline, what_happened, why_it_matters, new_terms, url, source, digest_date, article_read_minutes";

function isMissingColumn(error, column) {
  // 42703 is Postgres's "undefined_column" code; the message check is a
  // fallback in case a Postgrest version ever omits it.
  return error.code === "42703" || new RegExp(`\\b${column}\\b.*does not exist`, "i").test(error.message ?? "");
}

// Runs the same query, falling back a column at a time, so the site keeps
// working (just without that column's data) if a migration in
// MANUAL_STEPS.md hasn't been run yet, rather than erroring.
async function selectEntries(supabase, applyFilters) {
  let { data, error } = await applyFilters(supabase.from("digest_entries").select(ENTRY_COLUMNS));

  if (error && isMissingColumn(error, "deep_dive")) {
    ({ data, error } = await applyFilters(
      supabase.from("digest_entries").select(ENTRY_COLUMNS_WITHOUT_DEEP_DIVE)
    ));
    if (!error) data = (data ?? []).map((row) => ({ ...row, deep_dive: null }));
  }

  if (error && isMissingColumn(error, "section")) {
    ({ data, error } = await applyFilters(
      supabase.from("digest_entries").select(ENTRY_COLUMNS_WITHOUT_SECTION)
    ));
    if (!error) data = (data ?? []).map((row) => ({ ...row, section: "main", deep_dive: null }));
  }

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return data ?? [];
}

// Entries within a day are numbered in the order the pipeline wrote them.
async function getEntriesForDate(date) {
  const supabase = getSupabaseClient();
  return selectEntries(supabase, (query) =>
    query.eq("digest_date", date).order("id", { ascending: true })
  );
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
