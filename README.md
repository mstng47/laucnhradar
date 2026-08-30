# Sift

An automated daily AI briefing written for one specific reader. Pulls items from
AI news feeds, Product Hunt and Hacker News, then Claude selects only the few
that matter to that reader and rewrites them in plain English.

**Setting it up by hand (database, secrets, deploys): see [MANUAL_STEPS.md](MANUAL_STEPS.md).**

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your keys (see below for where to get each one).
3. Run `supabase/schema.sql` in your Supabase project's SQL Editor to create the
   `digest_entries` and `glossary_terms` tables.
4. Run the pipeline once manually to check it works:
   ```
   npm run pipeline
   ```
5. Check `output/latest.<slug>.json` (one per profile, e.g. `output/latest.finn.json`)
   — that's the briefing. If `SUPABASE_URL`/`SUPABASE_KEY` are set, the same entries
   are also saved to Supabase for the website to read.

## Where to get each key

| Key | Where |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `SUPABASE_URL` / `SUPABASE_KEY` | supabase.com → project → Settings → API (use the **secret** key here) |
| `RESEND_API_KEY` | resend.com → API Keys (only needed once you wire up email sending) |

The news feeds and Hacker News need no keys.

## Pipeline

```
config/sources.json      → which feeds to read; edit to add or remove sources
scripts/profiles/        → one file per reader (see index.json for the full list);
                           who each briefing is written for, edit any time
collect.mjs              → pulls recent items from the configured sources into output/raw.json
summarize.mjs            → sends raw items + each profile's reader text to Claude, once
                           per profile, writing output/latest.<slug>.json and saving
                           entries to Supabase
run-pipeline.mjs         → runs both steps in sequence
check-sources.mjs        → checks every feed in sources.json still works (`npm run check-sources`)
```

## Email delivery

Readers can subscribe at `/email` on the website to get the daily briefing
sent to their inbox instead of (or alongside) visiting the site, on
whichever days, time and timezone they choose.

```
supabase/schema.sql       → email_subscribers table (email, days, send_time, timezone, ...)
scripts/send-emails.mjs   → runs every 15 min via GitHub Actions, sends to whoever's due now
scripts/lib/emailTemplate.mjs → the actual daily-briefing email HTML
web/app/email/            → signup and manage-schedule page
web/app/api/subscribe/    → creates/updates a subscriber, sends a confirmation email
web/app/api/unsubscribe/  → one-click unsubscribe (also wired for RFC 8058)
```

See [MANUAL_STEPS.md](MANUAL_STEPS.md) for the one-time Resend/Supabase
setup this needs before it can actually send mail.

## Website

The Next.js site in `web/` reads from Supabase with the public *publishable* key
and is deployed on Vercel. Run it locally with:

```
npm --prefix web run dev
```

It needs `web/.env.local` — copy `web/.env.example` and fill in the project URL
and publishable key.

## Next steps

- Add Stripe for the premium tier
