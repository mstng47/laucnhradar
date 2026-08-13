# Manual steps

Everything that has to be done by hand, in one place. Nothing here needs any
coding — it's copying, pasting and clicking.

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
