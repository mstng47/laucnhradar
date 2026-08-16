import DeepDive from "./DeepDive";

export default function BriefingList({ entries }) {
  const total = String(entries.length).padStart(2, "0");

  return (
    <ol className="story-list">
      {entries.map((entry, index) => (
        <li className="story" key={entry.id}>
          <div className="story-head">
            <span className="story-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
              <span className="story-index-total"> / {total}</span>
            </span>
            <a
              className="story-headline"
              href={entry.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              {entry.headline}
            </a>
          </div>

          <p className="story-summary">{entry.what_happened}</p>

          <div className="story-angle">
            <span className="story-angle-label">Your angle</span>
            <p>{entry.why_it_matters}</p>
          </div>

          <div className="story-meta">
            {entry.new_terms?.length > 0 && (
              <div className="chips">
                {entry.new_terms.map((term) => (
                  <span key={term.term} className="chip" title={term.definition}>
                    {term.term}
                  </span>
                ))}
              </div>
            )}
            <a
              className="story-source"
              href={entry.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span>{entry.source}</span>
              {Number.isFinite(entry.article_read_minutes) && (
                <span>· {entry.article_read_minutes} min</span>
              )}
              <span className="story-source-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
            <DeepDive text={entry.deep_dive} />
          </div>
        </li>
      ))}
    </ol>
  );
}
