// The small, hand-maintained list of reader profiles the pipeline
// generates a briefing for — see scripts/profiles/index.json. Each entry
// names a slug (must match a row in Supabase's `profiles` table), the
// profile file to read, and the one-line "closing angle" deep-dive.mjs
// ends each expanded write-up on.

import { readFile } from "fs/promises";

const INDEX_PATH = new URL("../profiles/index.json", import.meta.url);
const PROFILES_DIR = new URL("../profiles/", import.meta.url);

async function loadProfileRegistry() {
  return JSON.parse(await readFile(INDEX_PATH, "utf-8"));
}

// Same convention the old single reader-profile.md used: everything above
// the "---" divider is a note for whoever's editing the file by hand, not
// part of the profile itself — strip it before it reaches the prompt.
async function loadProfileText(file) {
  const raw = await readFile(new URL(file, PROFILES_DIR), "utf-8");
  const afterDivider = raw.split(/^---$/m)[1];
  return (afterDivider ?? raw).trim();
}

// Resolves each registry entry to the profile text Claude should see plus
// the real database id every generated row gets stamped with. Throws
// loudly on a profile with no matching `profiles` row rather than
// skipping it or writing rows with no owner — a missing profile is a
// setup mistake worth stopping the run for, not something to paper over.
//
// When supabase isn't configured (local dry runs without credentials —
// same "best effort" pattern the rest of this pipeline already uses),
// `id` comes back null for every profile so the rest of the pipeline can
// still be exercised locally; nothing gets saved either way in that case.
async function loadActiveProfiles(supabase) {
  const registry = await loadProfileRegistry();

  return Promise.all(
    registry.map(async (entry) => {
      const text = await loadProfileText(entry.file);

      if (!supabase) {
        return { ...entry, text, id: null };
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("slug", entry.slug)
        .maybeSingle();

      if (error) throw new Error(`Couldn't look up profile "${entry.slug}": ${error.message}`);
      if (!data) {
        throw new Error(
          `No profiles row found for slug "${entry.slug}" — insert one (see supabase/schema.sql) before running the pipeline.`
        );
      }

      return { ...entry, text, id: data.id };
    })
  );
}

export { loadProfileRegistry, loadProfileText, loadActiveProfiles };
