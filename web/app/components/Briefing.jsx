import BriefingList from "./BriefingList";
import CompactList from "./CompactList";
import { groupSections } from "../lib/format";

export default function Briefing({ entries }) {
  const { main, launches, also } = groupSections(entries);

  return (
    <>
      {main.length > 0 && (
        <section>
          <h2 className="section-heading">What matters today</h2>
          <BriefingList entries={main} />
        </section>
      )}

      {launches.length > 0 && (
        <section>
          <h2 className="section-heading-light">New launches</h2>
          <CompactList entries={launches} />
        </section>
      )}

      {also.length > 0 && (
        <section>
          <h2 className="section-heading-light">Also worth knowing</h2>
          <CompactList entries={also} />
        </section>
      )}
    </>
  );
}
