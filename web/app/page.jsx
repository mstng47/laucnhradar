import Link from "next/link";
import { getSupabaseClient } from "./supabase";

// Data changes daily via the pipeline's cron — always fetch fresh rather
// than serving a build-time snapshot.
export const dynamic = "force-dynamic";

async function getEntries() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("digest_entries")
    .select("id, headline, what_happened, why_it_matters, new_terms, url, source, digest_date")
    .order("digest_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return data ?? [];
}

function groupByDate(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (!groups.has(entry.digest_date)) groups.set(entry.digest_date, []);
    groups.get(entry.digest_date).push(entry);
  }
  return [...groups.entries()];
}

export default async function Home() {
  let entries;
  let loadError;

  try {
    entries = await getEntries();
  } catch (err) {
    loadError = err.message;
  }

  return (
    <main>
      <h1>LaunchRadar</h1>
      <p className="subtitle">Your daily AI briefing</p>
      <p className="backlink">
        <Link href="/glossary">Glossary →</Link>
      </p>

      {loadError && <p className="error">Couldn&apos;t load the digest: {loadError}</p>}

      {!loadError && entries.length === 0 && <p>No entries yet.</p>}

      {!loadError &&
        groupByDate(entries).map(([date, items]) => (
          <section key={date}>
            <h2>{date}</h2>
            <ul>
              {items.map((entry) => (
                <li key={entry.id}>
                  <a href={entry.url} target="_blank" rel="noreferrer noopener">
                    {entry.headline}
                  </a>
                  <p>{entry.what_happened}</p>
                  <p className="why">{entry.why_it_matters}</p>
                  {entry.new_terms?.length > 0 && (
                    <ul className="terms">
                      {entry.new_terms.map((t) => (
                        <li key={t.term}>
                          <strong>{t.term}:</strong> {t.definition}
                        </li>
                      ))}
                    </ul>
                  )}
                  <span className="meta">{entry.source}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </main>
  );
}
