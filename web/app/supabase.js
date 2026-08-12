import { createClient } from "@supabase/supabase-js";

// Both the briefing and the glossary page read from Supabase with the public
// publishable key, so the client and its config check live in one place.
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
        "— add them to web/.env.local (see web/.env.example)."
    );
  }
  return createClient(url, key);
}
