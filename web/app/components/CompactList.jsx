// variant distinguishes Launches (a compact, fast-scanning grid of
// tiles) from Radar (a dense, quieter list) — same markup either way,
// see the .brief-list--launches / .brief-list--radar rules in
// globals.css for what actually changes.
export default function CompactList({ entries, variant }) {
  return (
    <ul className={`brief-list${variant ? ` brief-list--${variant}` : ""}`}>
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
