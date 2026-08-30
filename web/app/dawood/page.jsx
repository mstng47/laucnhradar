import BriefingLayout from "../components/BriefingLayout";
import BriefingRail from "../components/BriefingRail";
import Briefing from "../components/Briefing";
import { getLatestBriefing } from "../lib/data";
import { estimateReadingMinutes, groupSections, formatDate } from "../lib/format";

// The Dawood test reader's own briefing — a straight copy of the root
// page ("/", Finn's), scoped to the "dawood" profile instead. Kept as
// its own route tree rather than a dynamic "/[profile]" segment: with
// just two profiles, a literal route is the simplest thing that works,
// and it means "/" keeps behaving exactly as it always has for Finn.
export const dynamic = "force-dynamic";

// See the note on FOCUS_LABELS in web/app/page.jsx — same reasoning,
// hardcoded from scripts/profiles/dawood.md rather than read live.
const FOCUS_LABELS = ["AI Automation", "Agents", "Venture & Startups"];

export default async function DawoodHome() {
  let date;
  let entries;
  let loadError;

  try {
    ({ date, entries } = await getLatestBriefing("dawood"));
  } catch (err) {
    loadError = err.message;
  }

  const { main, launches, also } = date ? groupSections(entries) : { main: [], launches: [], also: [] };
  const readMinutes = date ? estimateReadingMinutes(entries) : 0;

  return (
    <BriefingLayout
      rail={
        date && (
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
      <main>
        {loadError && <p className="error">Couldn&apos;t load the briefing: {loadError}</p>}

        {!loadError && entries.length === 0 && (
          <p className="empty-state">No briefing yet. Check back tomorrow morning.</p>
        )}

        {!loadError && entries.length > 0 && <Briefing entries={entries} />}
      </main>
    </BriefingLayout>
  );
}
