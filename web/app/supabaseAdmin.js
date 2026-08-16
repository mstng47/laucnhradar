import { createClient } from "@supabase/supabase-js";

// Server-only — the service_role key bypasses RLS entirely. Only ever
// import this from app/api/*/route.js (Route Handlers run server-side;
// this must never reach a client bundle). email_subscribers has no public
// RLS policy at all (see supabase/schema.sql), so this is the only way
// anything in the web app can read or write it.
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY " +
        "— add them to web/.env.local (see web/.env.example)."
    );
  }
  return createClient(url, key);
}
