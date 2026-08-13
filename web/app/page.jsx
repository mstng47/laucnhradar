import PageIntro from "./components/PageIntro";
import Briefing from "./components/Briefing";
import { getLatestBriefing } from "./lib/data";
import { formatDate, estimateReadingMinutes } from "./lib/format";

// Data changes daily via the pipeline's cron — always fetch fresh rather
// than serving a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Home() {
  let date;
  let entries;
  let loadError;

  try {
    ({ date, entries } = await getLatestBriefing());
  } catch (err) {
    loadError = err.message;
  }

  const meta = date && (
    <>
      <strong>{formatDate(date)}</strong>
      <span className="meta-dot">·</span>
      <span>
        {entries.length} item{entries.length === 1 ? "" : "s"}
      </span>
      <span className="meta-dot">·</span>
      <span>{estimateReadingMinutes(entries)} min read</span>
    </>
  );

  return (
    <>
      <PageIntro eyebrow="Your daily AI briefing" meta={meta} />
      <main className="container-wide">
        {loadError && <p className="error">Couldn&apos;t load the briefing: {loadError}</p>}

        {!loadError && entries.length === 0 && (
          <p className="empty-state">No briefing yet — check back tomorrow morning.</p>
        )}

        {!loadError && entries.length > 0 && <Briefing entries={entries} />}
      </main>
    </>
  );
}
