"use client";

import { useMemo, useState } from "react";

function groupAlphabetically(terms) {
  const groups = new Map();
  for (const term of terms) {
    const letter = term.term[0]?.toUpperCase() ?? "#";
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(term);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function GlossaryBrowser({ terms }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return terms;
    return terms.filter(
      (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
    );
  }, [terms, query]);

  const groups = useMemo(() => groupAlphabetically(filtered), [filtered]);

  return (
    <>
      <input
        type="search"
        className="glossary-search"
        placeholder="Search terms..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search glossary terms"
      />

      {groups.length === 0 && (
        <p className="empty-state card">No terms match &quot;{query}&quot;.</p>
      )}

      {groups.map(([letter, items]) => (
        <section className="glossary-group" key={letter}>
          <h2 className="glossary-group-letter">{letter}</h2>
          <ul className="glossary-terms">
            {items.map((t) => (
              <li key={t.id} className="card">
                <span className="glossary-term">{t.term}</span>
                <p className="glossary-definition">{t.definition}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
