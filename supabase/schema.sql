-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- any time this file changes — every statement here is safe to re-run.

create table if not exists digest_entries (
  id bigint generated always as identity primary key,
  digest_date date not null,
  url text not null,
  source text not null,
  created_at timestamptz not null default now(),
  unique (digest_date, url)
);

-- Schema changed from a generic dev digest (title/summary) to a
-- personalized reader briefing (headline/what_happened/why_it_matters).
-- That migration already ran, years ago — the columns below already
-- exist in production. This block used to also `truncate table
-- digest_entries` here (there was no real reader history worth keeping
-- at the time it was written), which made re-running this whole file
-- destructive despite the top-of-file comment claiming it was always
-- safe. That line is gone now: every statement remaining here really is
-- a no-op against a database that already has these columns.
alter table digest_entries drop column if exists title;
alter table digest_entries drop column if exists summary;
alter table digest_entries add column if not exists headline text;
alter table digest_entries add column if not exists what_happened text;
alter table digest_entries add column if not exists why_it_matters text;
alter table digest_entries add column if not exists new_terms jsonb;
alter table digest_entries alter column headline set not null;
alter table digest_entries alter column what_happened set not null;
alter table digest_entries alter column why_it_matters set not null;

-- Estimated minutes to read the ORIGINAL linked article (not the briefing
-- item itself). Best-effort and often unknown — paywalled or unreachable
-- articles simply leave this null — so it stays nullable.
alter table digest_entries add column if not exists article_read_minutes integer;

-- Which of the three briefing sections this item belongs to: 'main' (full
-- treatment), 'launch' (new product, one line), or 'also' (one line).
-- Existing rows predate sections and default to 'main', which is the
-- correct read for them — they were written in the old flat, full-detail
-- format. 'launch' and 'also' items have no why_it_matters, so that column
-- can no longer be required.
alter table digest_entries add column if not exists section text not null default 'main';
alter table digest_entries alter column why_it_matters drop not null;

create index if not exists digest_entries_section_idx
  on digest_entries (digest_date, section);

-- The expanded, in-place "read here" version of a "main" item — an original
-- synthesis of its source, generated once by the pipeline and stored so the
-- website never regenerates it on page load. Null for launch/also items
-- (they're one-liners with nothing to expand) and for any main item whose
-- source couldn't be fetched or summarized — those simply show no expand
-- control on the site.
alter table digest_entries add column if not exists deep_dive text;

create index if not exists digest_entries_digest_date_idx
  on digest_entries (digest_date desc);

-- The website reads this table with the public "publishable" key, so RLS
-- must be on and only a SELECT policy granted. The pipeline's automation
-- writes with the "secret" (service_role) key, which bypasses RLS entirely
-- regardless of these policies — no write policy is needed or wanted here.
alter table digest_entries enable row level security;

drop policy if exists "Public read access" on digest_entries;
create policy "Public read access"
  on digest_entries
  for select
  to anon, authenticated
  using (true);


-- Glossary: every term the briefing has already explained to the reader.
-- The pipeline loads these before each run so it stops re-explaining things
-- already learned, and saves any newly defined terms afterwards.
create table if not exists glossary_terms (
  id bigint generated always as identity primary key,
  -- Lowercased form, used only to stop the same term being saved twice
  -- ("OWASP" and "owasp" are the same term to a reader).
  term_key text not null unique,
  term text not null,
  definition text not null,
  first_seen_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists glossary_terms_term_idx on glossary_terms (term);

alter table glossary_terms enable row level security;

drop policy if exists "Public read access" on glossary_terms;
create policy "Public read access"
  on glossary_terms
  for select
  to anon, authenticated
  using (true);


-- Email delivery: lets a reader get the daily briefing sent to their inbox
-- on their own chosen days/time/timezone instead of (or alongside) visiting
-- the site. One row per subscriber, keyed by email.

-- gen_random_bytes() (used for manage_token below) lives in pgcrypto,
-- unlike gen_random_uuid() which Postgres has had built in since v13 —
-- Supabase usually ships pgcrypto enabled already, but this makes sure
-- rather than assuming.
create extension if not exists pgcrypto;

create table if not exists email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  enabled boolean not null default true,
  -- 0=Sunday..6=Saturday, matching JS Date#getDay() / Intl weekday math —
  -- both send-emails.mjs (Node) and the preferences form (browser) compute
  -- "today" this same way, so the two never disagree about which day it is.
  days smallint[] not null default '{1,2,3,4,5}',
  -- Local wall-clock time, deliberately not a UTC instant — paired with
  -- timezone below so the delivery hour stays fixed to the reader's own
  -- clock across DST changes, rather than drifting by an hour twice a year.
  send_time time not null default '07:30:00',
  -- IANA name (e.g. "Europe/London"), not a fixed UTC offset — needed to
  -- resolve send_time to an actual instant, and to know which offset
  -- applies on any given day of the year.
  timezone text not null default 'UTC',
  -- Identifies this subscriber in email links (manage/unsubscribe) without
  -- requiring an account or password. Long and random enough to not be
  -- guessable; never logged or displayed, only ever compared against.
  manage_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  -- The digest_date most recently emailed to this subscriber. Prevents a
  -- double send if a cron run overlaps the previous one or is re-run by
  -- hand — "already sent today's issue" is a date comparison, not a
  -- timestamp one, since the whole point is once per digest per subscriber.
  last_sent_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_subscribers_enabled_idx
  on email_subscribers (enabled);

-- This table holds email addresses and a bearer-token-equivalent
-- (manage_token) — real PII, unlike the briefing content above. RLS is on
-- with NO policies at all: not even a public SELECT. The pipeline's cron
-- (send-emails.mjs) and the website's API routes (/api/subscribe,
-- /api/unsubscribe) both use the service_role key, which bypasses RLS —
-- the anon/publishable key the rest of the site reads with gets nothing
-- from this table, which is the point.
alter table email_subscribers enable row level security;


-- Multi-reader stage 1 (see supabase/migrations/20260829120000_add_profiles.sql
-- for the full explanation). Adds the idea of a "profile" — who a briefing
-- is written for — without changing anything anyone currently sees: nothing
-- reads or writes profile_id yet, and the existing "Finn" reader's rows are
-- backfilled onto a "finn" profile row so nothing is left unowned.
--
-- digest_entries' existing "one row per (digest_date, url)" rule is left
-- exactly as it is here — widening it to include profile_id is Stage 3
-- work, done together with the scripts/summarize.mjs change that writes
-- against the new rule. That means everything below is safe to run against
-- the live project on its own, any time: nothing here removes or narrows
-- anything the current pipeline depends on.

create table if not exists profiles (
  id bigint generated always as identity primary key,
  slug text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "Public read access" on profiles;
create policy "Public read access"
  on profiles
  for select
  to anon, authenticated
  using (true);

insert into profiles (slug, display_name)
values ('finn', 'Finn')
on conflict (slug) do nothing;

alter table digest_entries
  add column if not exists profile_id bigint references profiles(id);

alter table glossary_terms
  add column if not exists profile_id bigint references profiles(id);

alter table email_subscribers
  add column if not exists profile_id bigint references profiles(id);

create index if not exists digest_entries_profile_id_idx on digest_entries (profile_id);
create index if not exists glossary_terms_profile_id_idx on glossary_terms (profile_id);
create index if not exists email_subscribers_profile_id_idx on email_subscribers (profile_id);

update digest_entries
set profile_id = (select id from profiles where slug = 'finn')
where profile_id is null;

update glossary_terms
set profile_id = (select id from profiles where slug = 'finn')
where profile_id is null;

update email_subscribers
set profile_id = (select id from profiles where slug = 'finn')
where profile_id is null;

-- Not done here: digest_entries keeps its existing "one row per
-- (digest_date, url)" rule untouched. Widening it to (digest_date, url,
-- profile_id) is Stage 3 work, landing together with the summarize.mjs
-- change that writes against the new rule instead of this one.


-- Multi-reader stage 3 (see
-- supabase/migrations/20260829140000_stage3_widen_uniqueness.sql for the
-- full explanation). Ships together with the scripts/summarize.mjs and
-- scripts/deep-dive.mjs changes that write against the rules widened
-- below — applying this on its own is fine, but the pipeline code must
-- not go out ahead of it, or its next run fails outright.

update digest_entries
set profile_id = (select id from profiles where slug = 'finn')
where profile_id is null;

update glossary_terms
set profile_id = (select id from profiles where slug = 'finn')
where profile_id is null;

update email_subscribers
set profile_id = (select id from profiles where slug = 'finn')
where profile_id is null;

insert into profiles (slug, display_name)
values ('dawood', 'Dawood test reader')
on conflict (slug) do nothing;

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

-- glossary_terms: one row per term GLOBALLY becomes one row per
-- (profile, term) — Finn and Dawood each need their own "already
-- explained this" record, even for the exact same term.
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
