# LaunchRadar

An automated daily AI briefing written for one specific reader. Pulls raw
items from Product Hunt + Hacker News, then Claude selects and rewrites
only what's relevant to that reader — see `scripts/reader-profile.md` to
change who it's written for.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your keys (see below for where to get each one).
3. If you want digest entries persisted to Supabase, run `supabase/schema.sql`
   once in your Supabase project's SQL Editor to create the `digest_entries` table.
4. Run the pipeline once manually to check it works:
   ```
   node scripts/run-pipeline.mjs
   ```
5. Check `output/latest.json` — that's your digest, ready to email or render.
   If `SUPABASE_URL`/`SUPABASE_KEY` are set, the same entries are also
   upserted into the `digest_entries` table (deduplicated by date + url).

## Where to get each key

| Key | Where |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `PRODUCTHUNT_TOKEN` | api.producthunt.com/v2/docs → create an app → developer token |
| `SUPABASE_URL` / `SUPABASE_KEY` | supabase.com → new project → Settings → API |
| `RESEND_API_KEY` | resend.com → API Keys (only needed once you wire up email sending) |

HN needs no key — the Algolia search API is public.

## Pipeline

```
collect.mjs         → pulls raw items from Product Hunt + HN into output/raw.json
summarize.mjs        → sends raw.json + reader-profile.md to Claude, returns the day's briefing
reader-profile.md    → who the briefing is written for — edit this any time, no code changes needed
run-pipeline.mjs     → runs both steps in sequence, writes output/latest.json
```

## Next steps after this works locally

- Add Resend to send the digest as an email
- Add Stripe for the premium tier
