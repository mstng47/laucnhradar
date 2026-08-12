import Link from "next/link";
import { getSupabaseClient } from "../supabase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Glossary — LaunchRadar",
  description: "Every term the briefing has explained, in plain English",
};

async function getTerms() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("glossary_terms")
    .select("id, term, definition")
    .order("term", { ascending: true });

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return data ?? [];
}

export default async function Glossary() {
  let terms;
  let loadError;

  try {
    terms = await getTerms();
  } catch (err) {
    loadError = err.message;
  }

  return (
    <main>
      <h1>Glossary</h1>
      <p className="subtitle">Every term the briefing has explained so far</p>
      <p className="backlink">
        <Link href="/">← Back to the briefing</Link>
      </p>

      {loadError && <p className="error">Couldn&apos;t load the glossary: {loadError}</p>}

      {!loadError && terms.length === 0 && (
        <p>No terms yet — they&apos;ll appear here as the briefing explains them.</p>
      )}

      {!loadError && terms.length > 0 && (
        <dl className="glossary">
          {terms.map((t) => (
            <div key={t.id}>
              <dt>{t.term}</dt>
              <dd>{t.definition}</dd>
            </div>
          ))}
        </dl>
      )}
    </main>
  );
}
