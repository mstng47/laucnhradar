# LaunchRadar

Automated daily digest of new AI tool launches (Product Hunt + Hacker News + GitHub Trending),
summarized and ranked by Claude.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your keys (see below for where to get each one).
3. Run the pipeline once manually to check it works:
   ```
   node scripts/run-pipeline.mjs
   ```
4. Check `output/latest.json` — that's your digest, ready to email or render.

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
collect.mjs      → pulls raw items from Product Hunt + HN into output/raw.json
summarize.mjs     → sends raw.json to Claude, returns ranked/summarized digest
run-pipeline.mjs  → runs both steps in sequence, writes output/latest.json
```

## Next steps after this works locally

- Push to GitHub, add a GitHub Actions workflow to run `run-pipeline.mjs` on a daily cron
- Add Supabase writes so results persist and a Next.js site can read them
- Add Resend to send the digest as an email
- Add Stripe for the premium tier
