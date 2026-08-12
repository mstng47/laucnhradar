# Manual steps

Everything that has to be done by hand, in one place. Nothing here needs any
coding — it's copying, pasting and clicking.

---

## Add the "article reading time" column

This PR makes the daily pipeline estimate how long the *original linked
article* takes to read, and the website shows it quietly next to the source
name. The database needs one new column to store that number.

**Run this before or right after merging this PR — the website reads this
column on every visit, so until it exists, the briefing page will show an
error instead of your briefing** (the archive and glossary pages are
unaffected). It's a one-line, non-destructive change — nothing existing is
touched or deleted.

1. Go to **https://supabase.com** and open your project.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query** (top of the page).
4. Copy the line below and paste it into the empty box.
5. Click the green **Run** button (bottom right). It may also say **Run CTRL+Enter**.
6. You should see **"Success. No rows returned"**. That means it worked.

```sql
alter table digest_entries add column if not exists article_read_minutes integer;
```

> Safe to run as many times as you like — if the column already exists, this
> does nothing.

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
