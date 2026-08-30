import BriefingList from "./BriefingList";
import CompactList from "./CompactList";
import StoryReveal from "./StoryReveal";
import BriefingComplete from "./BriefingComplete";
import { groupSections } from "../lib/format";

// Sections stacked in reading order: the full-detail stories first,
// under their own "TODAY'S BRIEFING" title, then Launches and Radar —
// each visually distinct from the main briefing and from each other
// (see CompactList's variant prop). Section ids match the rail's anchor
// nav (Briefing / Launches / Radar in BriefingRail.jsx).
export default function Briefing({ entries }) {
  const { main, launches, also } = groupSections(entries);

  return (
    <>
      <StoryReveal />

      {main.length > 0 && (
        <section id="briefing">
          <h2 className="briefing-section-title">Today&apos;s Briefing</h2>
          <BriefingList entries={main} />
        </section>
      )}

      {launches.length > 0 && (
        <section id="launches">
          <h2 className="section-heading-light">New launches</h2>
          <CompactList entries={launches} variant="launches" />
        </section>
      )}

      {also.length > 0 && (
        <section id="radar">
          <h2 className="section-heading-light">Radar</h2>
          <CompactList entries={also} variant="radar" />
        </section>
      )}

      <BriefingComplete />
    </>
  );
}
