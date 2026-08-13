export default function CompactList({ entries }) {
  return (
    <ul className="compact-list">
      {entries.map((entry) => (
        <li className="compact-item" key={entry.id}>
          <a
            className="compact-name"
            href={entry.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            {entry.headline}
          </a>
          {" — "}
          {entry.what_happened}
          <span className="compact-source">{entry.source}</span>
        </li>
      ))}
    </ul>
  );
}
