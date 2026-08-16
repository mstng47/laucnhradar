import Link from "next/link";
import ContentFrame from "../../components/ContentFrame";
import BriefingOpen from "../../components/BriefingOpen";
import Briefing from "../../components/Briefing";
import { getEntriesForDate } from "../../lib/data";
import { formatDate, estimateReadingMinutes, groupSections } from "../../lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { date } = await params;
  return { title: `${date} · Sift` };
}

export default async function ArchiveDate({ params }) {
  const { date } = await params;

  let entries;
  let loadError;

  try {
    entries = await getEntriesForDate(date);
  } catch (err) {
    loadError = err.message;
  }

  const mainCount = !loadError && entries.length > 0 ? groupSections(entries).main.length : 0;
  const readMinutes = !loadError && entries.length > 0 ? estimateReadingMinutes(entries) : 0;
  const meta =
    !loadError &&
    entries?.length > 0 &&
    (mainCount > 0
      ? `${readMinutes} min read`
      : `${entries.length} item${entries.length === 1 ? "" : "s"} · ${readMinutes} min read`);

  return (
    <ContentFrame>
      <p className="back-row container">
        <Link href="/archive" className="back-link">
          ← All briefings
        </Link>
      </p>

      {!loadError && entries.length > 0 && (
        <BriefingOpen
          eyebrow={formatDate(date, { weekday: "long" })}
          heading="What mattered that day"
          mainCount={mainCount}
          meta={meta}
        />
      )}

      <main className="container">
        {loadError && <p className="error">Couldn&apos;t load this briefing: {loadError}</p>}

        {!loadError && entries.length === 0 && (
          <p className="empty-state">No briefing was saved for this date.</p>
        )}

        {!loadError && entries.length > 0 && <Briefing entries={entries} />}
      </main>
    </ContentFrame>
  );
}
