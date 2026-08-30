import Link from "next/link";
import BriefingLayout from "../../../components/BriefingLayout";
import BriefingRail from "../../../components/BriefingRail";
import Briefing from "../../../components/Briefing";
import { getEntriesForDate } from "../../../lib/data";
import { formatDate, estimateReadingMinutes, groupSections } from "../../../lib/format";

// Mirrors /archive/[date], scoped to the "dawood" profile — see
// web/app/dawood/page.jsx for why this is a separate literal route
// rather than a dynamic "/[profile]" one.
export const dynamic = "force-dynamic";

// See the note on FOCUS_LABELS in web/app/dawood/page.jsx.
const FOCUS_LABELS = ["AI Automation", "Agents", "Venture & Startups"];

export async function generateMetadata({ params }) {
  const { date } = await params;
  return { title: `${date} · Sift` };
}

export default async function DawoodArchiveDate({ params }) {
  const { date } = await params;

  let entries;
  let loadError;

  try {
    entries = await getEntriesForDate(date, "dawood");
  } catch (err) {
    loadError = err.message;
  }

  const hasEntries = !loadError && entries?.length > 0;
  const { main, launches, also } = hasEntries ? groupSections(entries) : { main: [], launches: [], also: [] };
  const readMinutes = hasEntries ? estimateReadingMinutes(entries) : 0;

  return (
    <BriefingLayout
      rail={
        hasEntries && (
          <BriefingRail
            date={formatDate(date, { weekday: "long" })}
            name="Dawood"
            storyCount={main.length}
            readMinutes={readMinutes}
            focusLabels={FOCUS_LABELS}
            hasBriefing={main.length > 0}
            hasLaunches={launches.length > 0}
            hasRadar={also.length > 0}
          />
        )
      }
    >
      <p className="back-row">
        <Link href="/dawood/archive" className="back-link">
          ← All briefings
        </Link>
      </p>

      <main>
        {loadError && <p className="error">Couldn&apos;t load this briefing: {loadError}</p>}

        {!loadError && entries.length === 0 && (
          <p className="empty-state">No briefing was saved for this date.</p>
        )}

        {hasEntries && <Briefing entries={entries} />}
      </main>
    </BriefingLayout>
  );
}
