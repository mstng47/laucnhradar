-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query)
-- to create the table summarize.mjs writes each day's digest into.

create table if not exists digest_entries (
  id bigint generated always as identity primary key,
  digest_date date not null,
  title text not null,
  url text not null,
  summary text not null,
  source text not null,
  created_at timestamptz not null default now(),
  unique (digest_date, url)
);

create index if not exists digest_entries_digest_date_idx
  on digest_entries (digest_date desc);
