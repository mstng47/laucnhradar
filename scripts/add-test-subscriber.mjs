// Manual CLI helper for the multi-profile test phase: adds (or updates)
// one email_subscribers row tagged with a specific profile, without going
// through the website's public /api/subscribe route — that route isn't
// being changed yet, so it has no way to say "sign this address up for
// Dawood, not Finn". This script is the "simple way to specify the
// profile" for the Dawood test user until a real picker/route exists.
//
// Usage:
//   node scripts/add-test-subscriber.mjs --email you@example.com
//   node scripts/add-test-subscriber.mjs --email you@example.com --profile dawood
//   node scripts/add-test-subscriber.mjs --email you@example.com --profile dawood --days 1,2,3,4,5 --time 07:30 --tz Europe/Paris
//
// --profile defaults to "finn" — running this with just --email reproduces
// today's normal signup, so existing/default behavior stays pointed at
// Finn unless Dawood is asked for explicitly.
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    throw new Error("SUPABASE_URL/SUPABASE_KEY are required.");
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
  if (!email) {
    throw new Error(
      "Usage: node scripts/add-test-subscriber.mjs --email you@example.com [--profile dawood] [--days 1,2,3,4,5] [--time 07:30] [--tz Europe/Paris]"
    );
  }

  const slug = args.profile ?? "finn";
  const days = (args.days ?? "1,2,3,4,5").split(",").map(Number);
  const sendTime = args.time ?? "07:30";
  const timezone = args.tz ?? "UTC";

  const supabase = getSupabase();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (profileError) {
    throw new Error(
      `Couldn't look up profile "${slug}": ${profileError.message}. ` +
        "The multi-profile migrations may not be applied yet."
    );
  }
  if (!profile) {
    throw new Error(`No profiles row for slug "${slug}" — check the slug, or that migrations have been applied.`);
  }

  const { data, error } = await supabase
    .from("email_subscribers")
    .upsert(
      { email, days, send_time: sendTime, timezone, enabled: true, profile_id: profile.id },
      { onConflict: "email" }
    )
    .select()
    .single();
  if (error) throw new Error(`Couldn't save subscriber: ${error.message}`);

  console.log(`Subscribed ${email} to the "${profile.slug}" briefing (subscriber id=${data.id}).`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
