export default function BriefingList({ entries }) {
  return (
    <ol className="briefing-list">
      {entries.map((entry, index) => (
        <li className="card briefing-item" key={entry.id}>
          <div className="item-head">
            <span className="item-number" aria-hidden="true">
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

          <div className="why-box">
            <span className="why-label">Why it matters</span>
            <p>{entry.why_it_matters}</p>
          </div>

          <div className="item-footer">
            {entry.new_terms?.length > 0 && (
              <div className="chips">
                {entry.new_terms.map((term) => (
                  <span
                    key={term.term}
                    className="chip chip-mint"
                    title={term.definition}
                  >
                    {term.term}
                  </span>
                ))}
              </div>
            )}
            <span className="chip chip-violet source-tag">{entry.source}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
