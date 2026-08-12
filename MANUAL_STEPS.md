# Manual steps

Everything that has to be done by hand, in one place. Nothing here needs any
coding — it's copying, pasting and clicking.

---

## Why reading times might not show up right away

Each item can show how long the *original linked article* takes to read,
fetched fresh by the daily pipeline. That number only appears on items from
briefings generated *after* this feature shipped — older rows in the database
were written before it existed, so they don't have one and never will.

If today's briefing shows no reading times, it just means the automatic
morning run (07:00 UTC) hasn't happened again yet since this was added.
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
