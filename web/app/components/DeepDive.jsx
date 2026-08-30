"use client";

import { useState } from "react";

// The deep-dive text arrives as plain text: paragraphs separated by a blank
// line, with "- " lines for the occasional bullet list (see the prompt in
// scripts/deep-dive.mjs). This turns that back into real <p>/<ul> markup
// instead of dumping it into one unbroken block. No heading/section
// parsing here on purpose — the generation prompt explicitly forbids
// markdown headers ("no ## headers") and strips any that slip through,
// so this content never actually contains them to style.
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

// A source the pipeline couldn't fetch or summarize (paywall, bot block, a
// stray API failure - see scripts/deep-dive.mjs) has no expand option. That
// used to render nothing at all, which reads as broken next to stories
// right above/below it that DO have the button - this makes the absence
// itself visible instead of silent, so it reads as "we tried" rather than
// "this is missing".
export default function DeepDive({ text }) {
  const [open, setOpen] = useState(false);

  if (!text) {
    return (
      <div className="deep-dive">
        <span className="deep-dive-unavailable">No deep dive for this source</span>
      </div>
    );
  }

  return (
    <div className="deep-dive">
      <button
        type="button"
        className="deep-dive-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "- Close" : "+ Deep dive"}
      </button>
      {open && (
        <div className="deep-dive-content">
          <div className="deep-dive-content-inner">
            <span className="deep-dive-label" aria-hidden="true">
              Analyst note
            </span>
            {renderDeepDiveText(text)}
          </div>
        </div>
      )}
    </div>
  );
}
