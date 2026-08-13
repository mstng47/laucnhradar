import BriefingList from "./BriefingList";
import CompactList from "./CompactList";
import { groupSections, collectTermsToday } from "../lib/format";

export default function Briefing({ entries }) {
  const { main, launches, also } = groupSections(entries);
  const termsToday = collectTermsToday(entries);
  const hasSidebar = launches.length > 0 || also.length > 0 || termsToday.length > 0;

  return (
    <div className={hasSidebar ? "briefing-layout" : undefined}>
      <div className="briefing-main">
        {main.length > 0 && (
          <section>
            <h2 className="section-heading">What matters today</h2>
            <BriefingList entries={main} />
          </section>
        )}
      </div>

      {hasSidebar && (
        <aside className="briefing-sidebar">
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

          {termsToday.length > 0 && (
            <section>
              <h2 className="section-heading-light">Terms explained today</h2>
              <ul className="sidebar-terms">
                {termsToday.map((term) => (
                  <li key={term.term}>
                    <span className="chip">{term.term}</span>
                    <p className="sidebar-term-def">{term.definition}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      )}
    </div>
  );
}
