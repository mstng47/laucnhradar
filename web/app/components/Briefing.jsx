import BriefingList from "./BriefingList";
import CompactList from "./CompactList";
import { groupSections, collectTermsToday } from "../lib/format";

// Single column, sections stacked in reading order: full-detail items
// first, then the two compact one-liner sections, then today's defined
// terms. No sidebar — a wide screen just gets a wider centred column
// (see --content-width), not a second column competing for attention.
export default function Briefing({ entries }) {
  const { main, launches, also } = groupSections(entries);
  const termsToday = collectTermsToday(entries);

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

      {termsToday.length > 0 && (
        <section>
          <h2 className="section-heading-light">Terms explained today</h2>
          <ul className="compact-list today-terms">
            {termsToday.map((term) => (
              <li key={term.term}>
                <span className="chip">{term.term}</span>
                <p className="today-term-def">{term.definition}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
