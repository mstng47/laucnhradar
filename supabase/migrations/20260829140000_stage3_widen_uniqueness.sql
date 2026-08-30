-- Stage 3 of the multi-reader plan: the part of the schema change that was
-- deliberately deferred out of Stage 1
-- (supabase/migrations/20260829120000_add_profiles.sql) because it has to
-- land at the same moment as the pipeline code that writes against it.
--
-- What this file does, in order:
--   1. Re-runs the "any row with no profile belongs to Finn" backfill.
--      Between Stage 1 being applied and this migration, the pipeline
--      still didn't write profile_id on new rows (that only starts once
--      scripts/summarize.mjs is deployed alongside this file) — so any
--      digest/glossary/subscriber rows created in that window need
--      catching here too, not just the ones that existed before Stage 1.
--   2. Creates the Dawood test profile.
--   3. Widens digest_entries' uniqueness rule from "one row per
--      (date, url)" to "one row per (date, url, profile)".
--   4. Widens glossary_terms' uniqueness rule from "one row per term,
--      globally" to "one row per (profile, term)" — needed the moment two
--      profiles exist, since Finn and Dawood each need their own
--      "already explained this term" record even for the same term.
--      (This wasn't called out in the original Stage 1 scope, which only
--      mentioned the digest_entries rule — but "glossary lookups scoped
--      by profile" doesn't actually work without it: without this change,
--      two profiles trying to save the same term would collide on the
--      old single-column rule.)
--
-- IMPORTANT — this must be applied to production at the same time as the
-- updated scripts/summarize.mjs and scripts/deep-dive.mjs, never before:
-- those files already upsert against the NEW three/two-column rules
-- (see their onConflict targets). Applying this migration on its own
-- ahead of that code change is fine (nothing here removes anything the
-- OLD, unmodified pipeline code depends on for its next run — the old
-- rules are dropped, but the old code was never going to run again once
-- this ships). Applying the CODE ahead of THIS migration is what would
-- break: the upsert's onConflict target has to already exist as a real
-- constraint, or the next pipeline run fails outright.

-- ---------------------------------------------------------------------
-- 1. Catch anything created between Stage 1 and now
-- ---------------------------------------------------------------------

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
-- 2. The Dawood test profile
-- ---------------------------------------------------------------------

insert into profiles (slug, display_name)
values ('dawood', 'Dawood test reader')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 3. Widen digest_entries' uniqueness rule
-- ---------------------------------------------------------------------
-- Looked up rather than guessed, same approach as Stage 1 would have
-- used — safe even if this is the first time it's run, and a no-op if
-- somehow already done.

do $$
declare
  old_constraint_name text;
begin
  select tc.constraint_name into old_constraint_name
  from information_schema.table_constraints tc
  where tc.table_name = 'digest_entries'
    and tc.constraint_type = 'UNIQUE'
    and (
      select array_agg(kcu.column_name::text order by kcu.column_name)
      from information_schema.key_column_usage kcu
      where kcu.constraint_name = tc.constraint_name
        and kcu.table_name = 'digest_entries'
    ) = array['digest_date', 'url']::text[]
  limit 1;

  if old_constraint_name is not null then
    execute format('alter table digest_entries drop constraint %I', old_constraint_name);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'digest_entries_date_url_profile_key'
  ) then
    alter table digest_entries
      add constraint digest_entries_date_url_profile_key
      unique (digest_date, url, profile_id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. Widen glossary_terms' uniqueness rule
-- ---------------------------------------------------------------------
-- Same lookup-by-actual-columns approach, this time for whichever unique
-- rule covers exactly (term_key) alone.

do $$
declare
  old_constraint_name text;
begin
  select tc.constraint_name into old_constraint_name
  from information_schema.table_constraints tc
  where tc.table_name = 'glossary_terms'
    and tc.constraint_type = 'UNIQUE'
    and (
      select array_agg(kcu.column_name::text order by kcu.column_name)
      from information_schema.key_column_usage kcu
      where kcu.constraint_name = tc.constraint_name
        and kcu.table_name = 'glossary_terms'
    ) = array['term_key']::text[]
  limit 1;

  if old_constraint_name is not null then
    execute format('alter table glossary_terms drop constraint %I', old_constraint_name);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'glossary_terms_profile_term_key'
  ) then
    alter table glossary_terms
      add constraint glossary_terms_profile_term_key
      unique (profile_id, term_key);
  end if;
end $$;
