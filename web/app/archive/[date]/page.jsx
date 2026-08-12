import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import BriefingList from "../../components/BriefingList";
import { getEntriesForDate } from "../../lib/data";
import { formatDate, estimateReadingMinutes } from "../../lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { date } = await params;
  return { title: `${date} — LaunchRadar` };
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

  const meta = !loadError && entries.length > 0 && (
    <>
      <span>
        {entries.length} item{entries.length === 1 ? "" : "s"}
      </span>
      <span className="meta-dot">·</span>
      <span>{estimateReadingMinutes(entries)} min read</span>
    </>
  );

  return (
    <>
      <SiteHeader subtitle={formatDate(date, { weekday: "long" })} meta={meta} />
      <main className="container">
        <p className="back-row">
          <Link href="/archive" className="back-link">
            ← All briefings
          </Link>
        </p>

        {loadError && <p className="error card">Couldn&apos;t load this briefing: {loadError}</p>}

        {!loadError && entries.length === 0 && (
          <p className="empty-state card">No briefing was saved for this date.</p>
        )}

        {!loadError && entries.length > 0 && <BriefingList entries={entries} />}
      </main>
    </>
  );
}
