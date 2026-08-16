import BriefingList from "./BriefingList";
import CompactList from "./CompactList";
import StoryReveal from "./StoryReveal";
import { groupSections, collectTermsToday } from "../lib/format";

// Single column, sections stacked in reading order: the full-detail
// stories first (framed by BriefingOpen above this component, not a
// heading in here), then the two compact one-liner sections, then
// today's defined terms. No sidebar — a wide screen just gets a wider
// centred column (see --content-width), not a second column competing
// for attention.
export default function Briefing({ entries }) {
  const { main, launches, also } = groupSections(entries);
  const termsToday = collectTermsToday(entries);

  return (
    <>
      <StoryReveal />

      {main.length > 0 && <BriefingList entries={main} />}

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
          <ul className="term-list">
            {termsToday.map((term) => (
              <li className="term-row" key={term.term}>
                <span className="term-tag">{term.term}</span>
                <p className="term-def">{term.definition}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
