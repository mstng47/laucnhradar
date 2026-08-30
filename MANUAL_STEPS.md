# Manual steps

Everything that has to be done by hand, in one place. Nothing here needs any
coding — it's copying, pasting and clicking.

---

## Deployment order for the multi-reader change (read this first)

Sift now generates a separate briefing per reader ("profile") — Finn, plus a
test reader for Dawood — instead of one briefing for everyone. Getting this
live needs three things, **and the order matters**:

1. **Database first.** Run every file in `supabase/migrations/`, in filename
   order (they're named so the order is obvious), in the Supabase SQL
   Editor. This creates the `profiles` table, the Finn and Dawood rows,
   and changes a couple of database rules so two readers can each have their
   own row for the same story.
2. **Then the pipeline code.** The version of `scripts/summarize.mjs` and
   `scripts/deep-dive.mjs` that generates one briefing per profile only
   works against the database rules from step 1 — it saves data in a shape
   that only exists after those rules change.
3. **Then the website code.** Same reasoning: the website's pages now ask
   "show me this specific profile's stories," which only makes sense once
   the database actually has profiles to ask for.

**Why the order matters, in plain terms:** each step depends on the one
before it existing already. Deploying the pipeline or website code before
the database migrations have been run means those parts of the site start
asking the database a question it doesn't know how to answer yet — that
shows up as the daily pipeline failing (a red X in GitHub Actions) or a
briefing page showing an error instead of stories. Running the database
migrations on their own, before the code, is safe — nothing reads or writes
the new pieces until the code catches up, so there's no rush to do the next
two steps immediately after, just before either of them.

---

## Add the "sections" column

The briefing is now split into three sections — **What matters today** (the
full-detail items, as before), **New launches** (quick one-line product
mentions), and **Also worth knowing** (quick one-line mentions of anything
else). The database needs one column to record which section each item
belongs to.

**Run this before or right after merging — until you do, the website will
show everything as one "What matters today" list** (it won't error; it just
won't have the new sections yet, since it can't tell them apart).

1. Go to **https://supabase.com** and open your project.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query** (top of the page).
4. Copy the lines below and paste them into the empty box.
5. Click the green **Run** button (bottom right). It may also say **Run CTRL+Enter**.
6. You should see **"Success. No rows returned"**. That means it worked.

```sql
alter table digest_entries add column if not exists section text not null default 'main';
alter table digest_entries alter column why_it_matters drop not null;
create index if not exists digest_entries_section_idx on digest_entries (digest_date, section);
```

> Safe to run as many times as you like. Nothing existing is touched or
> deleted — every row you already have gets labelled "main", which is the
> correct read for them: they were written before sections existed, in the
> old full-detail format.

---

## Add the "deep dive" column

Each item in **What matters today** can now be expanded in place for a
denser, fuller version — written fresh by Claude, not copied from the
source — so you can understand it without leaving the site or opening a
100-page PDF. The database needs one column to store that generated text.

**Run this before or right after merging — until you do, the daily pipeline
run will fail** with a red X on GitHub (Actions → Daily pipeline). Nothing
is lost — once you've added the column, re-run the pipeline manually (see
"Why reading times might not show up right away" below for how) and it'll
pick up normally the next morning either way.

1. Go to **https://supabase.com** and open your project.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query** (top of the page).
4. Copy the line below and paste it into the empty box.
5. Click the green **Run** button (bottom right). It may also say **Run CTRL+Enter**.
6. You should see **"Success. No rows returned"**. That means it worked.

```sql
alter table digest_entries add column if not exists deep_dive text;
```

> Safe to run as many times as you like. It only adds a column — nothing
> existing is touched or deleted.

### What to expect on API cost

This adds one more Claude call per item in "What matters today" (up to 5 a
day). Most days that's a few cents on top of the existing daily cost — most
sources are short news articles, and the deep dive for those is only a
couple of paragraphs. On a day where one of the items links to a long
report or whitepaper, that one item costs more (the fullest-treatment
version reads the report's full text), which can push that day's extra
cost up to somewhere around $0.30–$0.50. There's no per-day cap on this —
if that ever feels like too much, ask your developer (or Claude) to lower
the caps in `scripts/deep-dive.mjs`.

---

## Why reading times might not show up right away

Each item can show how long the *original linked article* takes to read,
fetched fresh by the daily pipeline. That number only appears on items from
briefings generated *after* this feature shipped — older rows in the database
were written before it existed, so they don't have one and never will.

If today's briefing shows no reading times, it just means the automatic
morning run (03:00 UTC) hasn't happened again yet since this was added.
Nothing to fix — tomorrow's briefing will have them. If you want them sooner:

1. Go to **https://github.com/mstng47/laucnhradar/actions**
2. Click **Daily pipeline** in the left sidebar, then **Run workflow** (green
   button), then **Run workflow** again in the box that appears.
3. Wait about a minute and refresh your phone's browser tab.

Some articles (paywalled, or sites that block automated requests) will never
show a reading time — that's expected, not an error, so the item just quietly
shows none.

---

## Turn on email delivery

Readers can now get the briefing sent to their inbox on whichever days and
time they choose, instead of (or as well as) visiting the site. This needs
three things set up by hand before any email will actually go out. Before
anyone's signed up, skipping this is harmless — the sending cron just logs
"0 due" and does nothing. Once someone *has* signed up and their chosen
time arrives, an unset key or an unverified domain shows up as a red X on
the **Send briefing emails** workflow (GitHub → Actions), not a silent
failure — so it's worth doing this before pointing anyone at `/email`.

### 1. Create the database table

1. Go to **https://supabase.com** and open your project.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Copy just the lines below (not the whole `supabase/schema.sql` file —
   older parts of that file predate a fix and aren't guaranteed safe to
   re-run against a database that already has data in it) and paste them in.
5. Click the green **Run** button. You should see **"Success. No rows
   returned"**.

```sql
create extension if not exists pgcrypto;

create table if not exists email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  enabled boolean not null default true,
  days smallint[] not null default '{1,2,3,4,5}',
  send_time time not null default '07:30:00',
  timezone text not null default 'UTC',
  manage_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  last_sent_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_subscribers_enabled_idx on email_subscribers (enabled);

alter table email_subscribers enable row level security;
```

> Safe to run as many times as you like — every line either creates
> something only if it's missing, or (the index/RLS lines) is a no-op if
> already done.

### 2. Sign up for Resend and verify a sending domain

Resend is the email-sending service — it's what actually delivers the
mail. There's a free tier that's plenty to start (a few thousand emails a
month).

1. Go to **https://resend.com** and create an account.
2. In the sidebar, click **API Keys** → **Create API Key**. Copy it
   somewhere safe — you'll paste it into two places in step 4.
3. In the sidebar, click **Domains** → **Add Domain**, and add a domain you
   own (e.g. `siftbrief.com`, not `gmail.com` — it has to be a domain you
   control the DNS for). Resend will show you 2-3 DNS records (usually
   named things like `resend._domainkey` and a few `TXT`/`MX` rows).
4. Add those DNS records wherever you manage that domain's DNS (your
   domain registrar, or Cloudflare, etc. — wherever you'd go to add any
   other DNS record for it). This step proves to email providers (Gmail,
   Outlook) that you're allowed to send mail as that domain, and it's what
   keeps your emails out of spam folders.
5. Back in Resend, wait for the domain to show **Verified** (can take a
   few minutes, sometimes longer depending on your DNS host).

**Until the domain shows Verified, Resend will only let you send test
emails to your own Resend account email — not to real subscribers.**

### 3. Add the keys as secrets

You're pasting the *same* Resend key into two places, because the pipeline
(GitHub Actions) and the website (Vercel) are two separate deployments
that each need their own copy.

**GitHub (for the pipeline's sending cron):**

Add each of these as its own repository secret — go to
**https://github.com/mstng47/laucnhradar/settings/secrets/actions**, click
**New repository secret**, and repeat for all three:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | the key from step 2 above |
| `SITE_URL` | your live website's URL, e.g. `https://sift.example.com` (no trailing slash) — used to build the links inside each email |
| `SIFT_FROM_ADDRESS` | optional. `Sift <sift@yourdomain.com>`, using the domain you verified in step 2. Leave unset to fall back to Resend's shared test address, which can only actually deliver to your own Resend account email — fine for a first test send, not for real subscribers |

**Vercel (for the website's signup/preferences pages):**

1. Go to your project on **https://vercel.com**, click **Settings** →
   **Environment Variables**.
2. Add `RESEND_API_KEY` (same value as above).
3. Add `SUPABASE_SERVICE_ROLE_KEY` — value is the same **secret**
   (service_role) key you already used for `SUPABASE_KEY` when you set up
   the pipeline (Supabase → project → Settings → API). The website needs
   its own copy because `email_subscribers` deliberately isn't readable
   with the public key the rest of the site uses.
4. Redeploy the site (Vercel usually does this automatically once you save
   new environment variables — if not, go to **Deployments** and redeploy
   the latest one).

### What to expect once it's live

- The email cron checks every 15 minutes for anyone due right now, so
  delivery lands within about 15 minutes of the time someone picked, not
  to the exact minute.
- Everyone gets the same day's briefing (the one on the site that day) at
  their own chosen local time — the content itself isn't re-personalized
  per subscriber, only the delivery schedule is.
- New signups get a short confirmation email straight away with a link to
  manage or cancel their schedule — that link is also in the footer of
  every daily email.

---

## Optional — change what the briefing is about

You don't need a developer for either of these. Edit the file on GitHub (open
it, click the pencil icon, make your change, then **Commit changes**).

- **Change who a briefing is written for** — edit that reader's file in
  `scripts/profiles/` (e.g. `finn.md`). Rewrite the bullet points to match
  what you care about. The next morning's briefing will follow the new
  profile. `scripts/profiles/index.json` lists every profile the pipeline
  currently generates a briefing for.

- **Change where the news comes from** — edit `config/sources.json`. Each source
  has a `name` and a `url`. Delete a block to remove a source.

  If you add a new source, it's worth checking the address actually works before
  trusting it. Ask your developer (or Claude) to run `npm run check-sources` —
  it reports which feeds are working and which are broken or out of date.
