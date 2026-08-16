import ContentFrame from "./components/ContentFrame";
import BriefingOpen from "./components/BriefingOpen";
import Briefing from "./components/Briefing";
import { getLatestBriefing } from "./lib/data";
import { estimateReadingMinutes, groupSections } from "./lib/format";

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

  const mainCount = date ? groupSections(entries).main.length : 0;
  const readMinutes = date ? estimateReadingMinutes(entries) : 0;
  // No date in the meta line — the masthead already shows today's date
  // once, above this; repeating it in the same breath read as clutter
  // rather than context.
  const meta =
    date &&
    (mainCount > 0
      ? `${readMinutes} min read`
      : `${entries.length} item${entries.length === 1 ? "" : "s"} today · ${readMinutes} min read`);

  return (
    <ContentFrame>
      {date && (
        <BriefingOpen
          eyebrow="Your Daily Sift"
          heading="Stories, selected for you"
          mainCount={mainCount}
          meta={meta}
        />
      )}
      <main className="container">
        {loadError && <p className="error">Couldn&apos;t load the briefing: {loadError}</p>}

        {!loadError && entries.length === 0 && (
          <p className="empty-state">No briefing yet. Check back tomorrow morning.</p>
        )}

        {!loadError && entries.length > 0 && <Briefing entries={entries} />}
      </main>
    </ContentFrame>
  );
}
