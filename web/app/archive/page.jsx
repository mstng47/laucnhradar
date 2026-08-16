import Link from "next/link";
import ContentFrame from "../components/ContentFrame";
import PageIntro from "../components/PageIntro";
import { getArchiveDates } from "../lib/data";
import { formatDate } from "../lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Archive — Sift",
  description: "Every past briefing, by date",
};

export default async function Archive() {
  let dates;
  let loadError;

  try {
    dates = await getArchiveDates();
  } catch (err) {
    loadError = err.message;
  }

  return (
    <ContentFrame>
      <PageIntro eyebrow="Every past briefing, by date" />
      <main className="container">
        {loadError && <p className="error">Couldn&apos;t load the archive: {loadError}</p>}

        {!loadError && dates.length === 0 && <p className="empty-state">No briefings yet.</p>}

        {!loadError && dates.length > 0 && (
          <ul className="archive-list">
            {dates.map(({ date, count }) => (
              <li key={date}>
                <Link href={`/archive/${date}`} className="archive-row">
                  <span className="archive-date">{formatDate(date, { weekday: "long" })}</span>
                  <span className="archive-count">
                    {count} item{count === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </ContentFrame>
  );
}
