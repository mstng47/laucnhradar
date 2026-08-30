-- Stage 1 of the multi-reader plan: teach the database about "profiles"
-- (who a briefing is written for) without changing what anybody sees today.
--
-- What this file does, in order:
--   1. Creates a new `profiles` table — one row per reader.
--   2. Creates a "Finn" profile row for the existing reader.
--   3. Adds a nullable `profile_id` column to the three tables that hold
--      reader-specific data (digest_entries, glossary_terms, email_subscribers).
--   4. Backfills every existing row in those three tables to point at Finn's
--      new profile row, so nothing is left "ownerless".
--
-- Every statement is written to be safe to run more than once (uses
-- `if not exists` / existence checks throughout), matching the convention
-- already used in supabase/schema.sql.
--
-- Deliberately NOT done here: digest_entries' existing uniqueness rule
-- ("one row per date+url, ever") is left exactly as it is. Widening it to
-- "one row per date+url+profile" is Stage 3 work, done in the same change
-- as updating scripts/summarize.mjs's upsert (which writes against the
-- current rule by name) — splitting those across two separate releases is
-- what would break the daily pipeline. Until that lands, every row's
-- profile_id is simply Finn's, which is the correct read for them: there's
-- only one reader today.
--
-- This means this migration is safe to apply on its own, any time, with no
-- coordinated pipeline change required: nothing here reads or writes
-- profile_id, and nothing here removes or narrows anything the pipeline
-- currently depends on.

-- ---------------------------------------------------------------------
-- 1. The profiles table
-- ---------------------------------------------------------------------

create table if not exists profiles (
  id bigint generated always as identity primary key,
  -- Short, URL-safe handle for this reader (e.g. "finn"). Not used by any
  -- page yet — that's a later stage — but reserved now so every other
  -- table can point at a stable identity rather than a display name that
  -- might change.
  slug text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Same public-read pattern as digest_entries/glossary_terms below: a
-- reader's slug and display name aren't sensitive, so this can stay
-- publicly readable. Nothing here has ever been, or will be, writable
-- with the public key — only the pipeline's/website's secret key can.
alter table profiles enable row level security;

drop policy if exists "Public read access" on profiles;
create policy "Public read access"
  on profiles
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------
-- 2. Finn's profile row
-- ---------------------------------------------------------------------

insert into profiles (slug, display_name)
values ('finn', 'Finn')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 3. Add profile_id to the three reader-specific tables
-- ---------------------------------------------------------------------
-- Nullable on purpose, for now: nothing reads or writes this column yet,
-- so existing inserts (from the unmodified pipeline/website code) keep
-- working exactly as they do today, with profile_id simply left blank
-- until backfilled below.

alter table digest_entries
  add column if not exists profile_id bigint references profiles(id);

alter table glossary_terms
  add column if not exists profile_id bigint references profiles(id);

alter table email_subscribers
  add column if not exists profile_id bigint references profiles(id);

-- Indexes for the per-profile lookups later stages will need
-- ("give me this profile's stories/terms/subscribers"). Harmless to add
-- now even though nothing queries by profile_id yet.
create index if not exists digest_entries_profile_id_idx on digest_entries (profile_id);
create index if not exists glossary_terms_profile_id_idx on glossary_terms (profile_id);
create index if not exists email_subscribers_profile_id_idx on email_subscribers (profile_id);

-- ---------------------------------------------------------------------
-- 4. Backfill: every existing row belongs to Finn
-- ---------------------------------------------------------------------
-- Only touches rows that don't have a profile yet, so this is safe to
-- run again later without disturbing anything already assigned.

update digest_entries
set profile_id = (select id from profiles where slug = 'finn')
where profile_id is null;

update glossary_terms
set profile_id = (select id from profiles where slug = 'finn')
where profile_id is null;

update email_subscribers
set profile_id = (select id from profiles where slug = 'finn')
where profile_id is null;

-- ---------------------------------------------------------------------
-- Deliberately not done here: digest_entries' uniqueness rule
-- ---------------------------------------------------------------------
-- The existing "one row per (digest_date, url)" rule is left exactly as
-- it is. Widening it to (digest_date, url, profile_id) — so two profiles
-- can each have their own write-up of the same story — is Stage 3 work,
-- landing together with the scripts/summarize.mjs change that writes
-- against the new rule instead of the current one. Doing it here, ahead
-- of that pipeline change, would break the next scheduled pipeline run.
