# Manual steps

Everything that has to be done by hand, in one place. Work through it top to
bottom. Nothing here needs any coding — it's copying, pasting and clicking.

Do these **after PR #1 is merged**, so the website and the automation are
running the new code.

---

## Step 1 — Update the Supabase database

The briefing changed shape (it now has a headline, a "what happened", a "why it
matters", and a glossary of terms). The database has to be updated to match, and
a new table added for the glossary.

**Heads-up before you start:** this clears out the handful of test rows already
in the table. That's on purpose — they're in the old format and can't be
converted. Nothing you care about is lost; a fresh briefing is written every
morning.

1. Go to **https://supabase.com** and open your project.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query** (top of the page).
4. Copy **everything** in the grey box below and paste it into the empty box.
5. Click the green **Run** button (bottom right). It may also say **Run CTRL+Enter**.
6. You should see **"Success. No rows returned"**. That means it worked.

```sql
create table if not exists digest_entries (
  id bigint generated always as identity primary key,
  digest_date date not null,
  url text not null,
  source text not null,
  created_at timestamptz not null default now(),
  unique (digest_date, url)
);

alter table digest_entries drop column if exists title;
alter table digest_entries drop column if exists summary;
alter table digest_entries add column if not exists headline text;
alter table digest_entries add column if not exists what_happened text;
alter table digest_entries add column if not exists why_it_matters text;
alter table digest_entries add column if not exists new_terms jsonb;
truncate table digest_entries;
alter table digest_entries alter column headline set not null;
alter table digest_entries alter column what_happened set not null;
alter table digest_entries alter column why_it_matters set not null;

create index if not exists digest_entries_digest_date_idx
  on digest_entries (digest_date desc);

alter table digest_entries enable row level security;

drop policy if exists "Public read access" on digest_entries;
create policy "Public read access"
  on digest_entries
  for select
  to anon, authenticated
  using (true);


create table if not exists glossary_terms (
  id bigint generated always as identity primary key,
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
```

> If you ever see an error mentioning `digest_entries` or `glossary_terms` on the
> website or in the daily run, come back and run this again. It's safe to run as
> many times as you like.

---

## Step 2 — Check the two GitHub secrets are there

These let the daily automation write into Supabase. You added them earlier; this
is just a check.

1. Go to **https://github.com/mstng47/laucnhradar/settings/secrets/actions**
2. Under **Repository secrets**, confirm you can see both of these names:
   - `ANTHROPIC_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
3. If any is missing, click **New repository secret**, type the name exactly as
   written above, paste the value, and click **Add secret**.

Where to find the values, if you need them:

| Secret | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `SUPABASE_URL` | Supabase → your project → Settings → API → **Project URL** |
| `SUPABASE_KEY` | Supabase → your project → Settings → API → the **secret** / service_role key (NOT the publishable one) |

---

## Step 3 — Run the briefing once, by hand, to check it works

1. Go to **https://github.com/mstng47/laucnhradar/actions**
2. In the left sidebar, click **Daily pipeline**.
3. On the right, click the **Run workflow** button, then the green
   **Run workflow** in the little box that appears.
4. Wait about a minute, then refresh the page.
5. Click into the run that just appeared.

**If it has a green tick** — it worked. Move to Step 4.

**If it has a red cross** — click into it and read the red error message at the
top. It's written in plain English and will usually say either that a secret is
missing (go back to Step 2) or that a database table is missing (go back to
Step 1).

---

## Step 4 — Confirm the briefing actually saved

1. In Supabase, click **Table Editor** in the left sidebar.
2. Choose the **digest_entries** table. You should see a few rows, each with a
   headline and a "why it matters".
3. Choose the **glossary_terms** table. You should see the terms the briefing
   explained today.

---

## Step 5 — Check the website

Vercel republishes the site automatically whenever the code changes, so there's
usually nothing to do here.

1. Open **https://laucnhradar.vercel.app** on your phone.
2. You should see today's briefing, and a **Glossary →** link near the top.
3. Tap the glossary link — it should list every term explained so far, A–Z.

**If the site shows an old design or an error:**

1. Go to **https://vercel.com** and open the **laucnhradar** project.
2. Click the **Deployments** tab.
3. Look at the newest deployment at the top. If it has a red **Error** label,
   click it and read the message.
4. To force a fresh publish, click the **…** menu on the right of the newest
   deployment and choose **Redeploy**.

---

## Optional — change what the briefing is about

You don't need a developer for either of these. Edit the file on GitHub (open
it, click the pencil icon, make your change, then **Commit changes**).

- **Change who the briefing is written for** — edit
  `scripts/reader-profile.md`. Rewrite the bullet points to match what you care
  about. The next morning's briefing will follow the new profile.

- **Change where the news comes from** — edit `config/sources.json`. Each source
  has a `name` and a `url`. Delete a block to remove a source.

  If you add a new source, it's worth checking the address actually works before
  trusting it. Ask your developer (or Claude) to run `npm run check-sources` —
  it reports which feeds are working and which are broken or out of date.
