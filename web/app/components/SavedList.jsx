"use client";

import { useEffect, useState } from "react";
import { CHANGED_EVENT, getAllSaved, removeStory } from "../lib/savedStories";
import { formatDate } from "../lib/format";

// Reads localStorage after mount, not during render — the server-rendered
// shell has no saved stories to show (they only exist in this browser), so
// starting from an empty list and filling in on mount avoids a
// hydration mismatch instead of trying to guess the client's storage.
export default function SavedList() {
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    const sync = () => setSaved(getAllSaved());
    sync();
    window.addEventListener(CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (saved === null) return null;

  if (saved.length === 0) {
    return <p className="empty-state">Stories you save show up here.</p>;
  }

  return (
    <ul className="saved-list">
      {saved.map((entry) => (
        <li key={entry.id}>
          <div className="saved-row">
            <div className="saved-row-main">
              <a
                className="saved-headline"
                href={entry.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {entry.headline}
              </a>
              <p className="saved-row-meta">
                {entry.source}
                {entry.digest_date && <> · {formatDate(entry.digest_date)}</>}
              </p>
            </div>
            <button type="button" className="saved-remove" onClick={() => removeStory(entry.id)}>
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
