"use client";

import { useState } from "react";

// The deep-dive text arrives as plain text: paragraphs separated by a blank
// line, with "- " lines for the occasional bullet list (see the prompt in
// scripts/deep-dive.mjs). This turns that back into real <p>/<ul> markup
// instead of dumping it into one unbroken block.
function renderDeepDiveText(text) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const isList = lines.length > 0 && lines.every((line) => line.startsWith("- "));

      if (isList) {
        return (
          <ul className="deep-dive-list" key={i}>
            {lines.map((line, j) => (
              <li key={j}>{line.replace(/^- /, "")}</li>
            ))}
          </ul>
        );
      }
      return <p key={i}>{block}</p>;
    });
}

// Renders nothing when there's no deep dive — a source that couldn't be
// fetched or summarized just means this item has no expand option, per the
// pipeline's fallback behaviour in scripts/deep-dive.mjs.
export default function DeepDive({ text }) {
  const [open, setOpen] = useState(false);

  if (!text) return null;

  return (
    <div className="deep-dive">
      <button
        type="button"
        className="deep-dive-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "− Close" : "+ Deep dive"}
      </button>
      {open && (
        <div className="deep-dive-content">
          <div className="deep-dive-content-inner">{renderDeepDiveText(text)}</div>
        </div>
      )}
    </div>
  );
}
