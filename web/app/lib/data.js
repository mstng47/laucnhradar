import { getSupabaseClient } from "../supabase";

const ENTRY_COLUMNS =
  "id, headline, what_happened, why_it_matters, url, source, digest_date, article_read_minutes, section, deep_dive";

// Same as ENTRY_COLUMNS minus `deep_dive`, for reading before the migration
// in MANUAL_STEPS.md has been run.
const ENTRY_COLUMNS_WITHOUT_DEEP_DIVE =
  "id, headline, what_happened, why_it_matters, url, source, digest_date, article_read_minutes, section";

// Same again minus `section` too, for reading before that earlier migration
// has been run.
const ENTRY_COLUMNS_WITHOUT_SECTION =
  "id, headline, what_happened, why_it_matters, url, source, digest_date, article_read_minutes";

function isMissingColumn(error, column) {
  // 42703 is Postgres's "undefined_column" code; the message check is a
  // fallback in case a Postgrest version ever omits it.
  return error.code === "42703" || new RegExp(`\\b${column}\\b.*does not exist`, "i").test(error.message ?? "");
}

// Every reader-facing table (digest_entries, glossary_terms) is scoped by
// profile_id, not by anything the page itself knows — a page only knows
// which profile it's showing (e.g. "finn", "dawood"; see the route
// files in web/app/ and web/app/dawood/), so every read here starts by
// resolving that slug to its real database id. Throws clearly rather than
// falling back to "show something anyway" — if a profile's row is
// missing, that's a setup mistake (the Stage 1/3 migrations haven't been
// applied yet — see MANUAL_STEPS.md) worth surfacing, not one profile's
// page silently showing another's content or nothing at all.
async function getProfileId(supabase, profileSlug) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("slug", profileSlug)
    .maybeSingle();

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  if (!data) {
    throw new Error(
      `No profile found for "${profileSlug}" — have the database migrations in supabase/migrations/ been applied? See MANUAL_STEPS.md.`
    );
  }
  return data.id;
}

// Runs the same query, falling back a column at a time, so the site keeps
// working (just without that column's data) if a migration in
// MANUAL_STEPS.md hasn't been run yet, rather than erroring.
async function selectEntries(supabase, profileId, applyFilters) {
  let { data, error } = await applyFilters(
    supabase.from("digest_entries").select(ENTRY_COLUMNS).eq("profile_id", profileId)
  );

  if (error && isMissingColumn(error, "deep_dive")) {
    ({ data, error } = await applyFilters(
      supabase.from("digest_entries").select(ENTRY_COLUMNS_WITHOUT_DEEP_DIVE).eq("profile_id", profileId)
    ));
    if (!error) data = (data ?? []).map((row) => ({ ...row, deep_dive: null }));
  }

  if (error && isMissingColumn(error, "section")) {
    ({ data, error } = await applyFilters(
      supabase.from("digest_entries").select(ENTRY_COLUMNS_WITHOUT_SECTION).eq("profile_id", profileId)
    ));
    if (!error) data = (data ?? []).map((row) => ({ ...row, section: "main", deep_dive: null }));
  }

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return data ?? [];
}

// Entries within a day are numbered in the order the pipeline wrote them.
// profileSlug is required — every caller must say whose briefing this is
// (e.g. "finn", "dawood"), never "the" briefing.
async function getEntriesForDate(date, profileSlug) {
  const supabase = getSupabaseClient();
  const profileId = await getProfileId(supabase, profileSlug);
  return selectEntries(supabase, profileId, (query) =>
    query.eq("digest_date", date).order("id", { ascending: true })
  );
}

async function getLatestBriefing(profileSlug) {
  const supabase = getSupabaseClient();
  const profileId = await getProfileId(supabase, profileSlug);

  const { data, error } = await supabase
    .from("digest_entries")
    .select("digest_date")
    .eq("profile_id", profileId)
    .order("digest_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  if (!data) return { date: null, entries: [] };

  return { date: data.digest_date, entries: await getEntriesForDate(data.digest_date, profileSlug) };
}

// One row per past entry is fetched and grouped in JS rather than adding a
// database view — the table is small enough that this stays fast, and it
// keeps the schema untouched.
async function getArchiveDates(profileSlug) {
  const supabase = getSupabaseClient();
  const profileId = await getProfileId(supabase, profileSlug);

  const { data, error } = await supabase
    .from("digest_entries")
    .select("digest_date")
    .eq("profile_id", profileId)
    .order("digest_date", { ascending: false });

  if (error) throw new Error(`Supabase query failed: ${error.message}`);

  const counts = new Map();
  for (const row of data ?? []) {
    counts.set(row.digest_date, (counts.get(row.digest_date) ?? 0) + 1);
  }
  return [...counts.entries()].map(([date, count]) => ({ date, count }));
}

export { getEntriesForDate, getLatestBriefing, getArchiveDates };
