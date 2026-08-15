import DeepDive from "./DeepDive";

export default function BriefingList({ entries }) {
  return (
    <ol className="briefing-list">
      {entries.map((entry, index) => (
        <li className="briefing-item" key={entry.id}>
          <div className="item-head">
            <span className="item-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <a
              className="item-headline"
              href={entry.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              {entry.headline}
            </a>
          </div>

          <p className="item-body">{entry.what_happened}</p>

          <div className="why-marker">
            <span className="why-label">Why it matters</span>
            <p>{entry.why_it_matters}</p>
          </div>

          <div className="item-footer">
            {entry.new_terms?.length > 0 && (
              <div className="chips">
                {entry.new_terms.map((term) => (
                  <span key={term.term} className="chip" title={term.definition}>
                    {term.term}
                  </span>
                ))}
              </div>
            )}
            <div className="item-attribution">
              <span className="source-tag">{entry.source}</span>
              {Number.isFinite(entry.article_read_minutes) && (
                <>
                  <span className="meta-dot">·</span>
                  <span className="read-time">{entry.article_read_minutes} min read</span>
                </>
              )}
            </div>
          </div>

          <DeepDive text={entry.deep_dive} />
        </li>
      ))}
    </ol>
  );
}
