export default function CompactList({ entries }) {
  return (
    <ul className="brief-list">
      {entries.map((entry) => (
        <li className="brief-row" key={entry.id}>
          <div className="brief-row-head">
            <a
              className="brief-row-name"
              href={entry.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              {entry.headline}
            </a>
            <span className="brief-row-source">{entry.source}</span>
          </div>
          <p className="brief-row-desc">{entry.what_happened}</p>
        </li>
      ))}
    </ul>
  );
}
