"use client";

import { useEffect, useState } from "react";
import { CHANGED_EVENT, isStorySaved, saveStory, removeStory } from "../lib/savedStories";

// Filled when saved, outline when not — teal fill on save, matching the
// site's one rule for that colour (globals.css: teal marks whatever is
// selected/personalised/interactive, never decorative).
function BookmarkIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M4 2.5C4 2.22386 4.22386 2 4.5 2H11.5C11.7761 2 12 2.22386 12 2.5V13.5C12 13.9328 11.4885 14.1637 11.1625 13.8781L8.16345 11.2715C8.06968 11.1896 7.93032 11.1896 7.83655 11.2715L4.83752 13.8781C4.5115 14.1637 4 13.9328 4 13.5V2.5Z"
        fill={filled ? "var(--teal)" : "none"}
        stroke={filled ? "var(--teal)" : "var(--text-soft)"}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SaveButton({ id, headline, url, source, digestDate }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(isStorySaved(id));
    sync();
    window.addEventListener(CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [id]);

  function toggle() {
    if (saved) {
      removeStory(id);
    } else {
      saveStory({ id, headline, url, source, digest_date: digestDate });
    }
  }

  return (
    <button
      type="button"
      className="save-toggle"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save story"}
      onClick={toggle}
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}
