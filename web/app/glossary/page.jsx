import SiteHeader from "../components/SiteHeader";
import GlossaryBrowser from "./GlossaryBrowser";
import { getGlossaryTerms } from "../lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Glossary — LaunchRadar",
  description: "Every term the briefing has explained, in plain English",
};

export default async function Glossary() {
  let terms;
  let loadError;

  try {
    terms = await getGlossaryTerms();
  } catch (err) {
    loadError = err.message;
  }

  const meta = !loadError && terms.length > 0 && (
    <span>
      {terms.length} term{terms.length === 1 ? "" : "s"} explained so far
    </span>
  );

  return (
    <>
      <SiteHeader subtitle="Every term the briefing has explained, in plain English" meta={meta} />
      <main className="container">
        {loadError && <p className="error card">Couldn&apos;t load the glossary: {loadError}</p>}

        {!loadError && terms.length === 0 && (
          <p className="empty-state card">
            No terms yet — they&apos;ll appear here as the briefing explains them.
          </p>
        )}

        {!loadError && terms.length > 0 && <GlossaryBrowser terms={terms} />}
      </main>
    </>
  );
}
