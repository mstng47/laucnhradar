"use client";

import { useState } from "react";
import DeepDive from "./DeepDive";
import SaveButton from "./SaveButton";

// The pipeline writes up to 8 "main" items a day (see SECTION_CAPS in
// scripts/summarize.mjs), ordered strongest first, but only the first 5
// are shown by default — the two-minute-read design still holds for
// anyone who never touches the button. Items 6-8 are already sitting in
// `entries`, generated and paid for that morning, not fetched live: the
// "load more" click is a client-only reveal, not a network request,
// which is what keeps it free and instant to click.
const INITIAL_COUNT = 5;
const BATCH_SIZE = 3;

// A brief, honest pause before revealing — there's no real work
// happening (the data's already loaded), but an instant pop-in reads as
// broken rather than deliberate. The blinking cursor is the one bit of
// motion during that pause; keep this short enough that it doesn't feel
// like stalling.
const REVEAL_DELAY_MS = 700;

export default function BriefingList({ entries }) {
  const [visibleCount, setVisibleCount] = useState(Math.min(INITIAL_COUNT, entries.length));
  const [loading, setLoading] = useState(false);
  // Index the current visible slice started at before the most recent
  // reveal — only items from THAT batch get the entrance animation, so
  // clicking again doesn't re-animate stories already on screen.
  const [justRevealedFrom, setJustRevealedFrom] = useState(null);

  const total = String(entries.length).padStart(2, "0");
  const visible = entries.slice(0, visibleCount);
  const remaining = entries.length - visibleCount;
  const nextBatchSize = Math.min(BATCH_SIZE, remaining);

  function handleLoadMore() {
    setLoading(true);
    window.setTimeout(() => {
      setJustRevealedFrom(visibleCount);
      setVisibleCount((count) => Math.min(count + BATCH_SIZE, entries.length));
      setLoading(false);
    }, REVEAL_DELAY_MS);
  }

  return (
    <>
      <ol className="story-list">
        {visible.map((entry, index) => (
          // The first story gets .story-lead — same card, more weight
          // (globals.css) — rather than a separate component, so the
          // "greater visual importance" is purely a CSS modifier on the
          // one story template.
          <li
            className={`story${index === 0 ? " story-lead" : ""}${justRevealedFrom !== null && index >= justRevealedFrom ? " story-just-added" : ""}`}
            key={entry.id}
          >
            {/* Identity/provenance stated up front — index, source,
                read time — before the headline, rather than filed away
                in a meta row at the bottom of the card. */}
            <div className="story-meta-top">
              <span className="story-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
                <span className="story-index-total"> / {total}</span>
              </span>
              <span className="meta-dot">·</span>
              <span className="story-source-name">{entry.source}</span>
              {Number.isFinite(entry.article_read_minutes) && (
                <>
                  <span className="meta-dot">·</span>
                  <span className="story-read-time">{entry.article_read_minutes} min</span>
                </>
              )}
            </div>

            <a className="story-headline" href={entry.url} target="_blank" rel="noreferrer noopener">
              {entry.headline}
            </a>

            <p className="story-summary">{entry.what_happened}</p>

            <div className="story-angle">
              <span className="story-angle-label">Why it matters to you</span>
              <p>{entry.why_it_matters}</p>
            </div>

            <div className="story-actions">
              <DeepDive text={entry.deep_dive} />
              <SaveButton
                id={entry.id}
                headline={entry.headline}
                url={entry.url}
                source={entry.source}
                digestDate={entry.digest_date}
              />
              <a className="story-source-link" href={entry.url} target="_blank" rel="noreferrer noopener">
                Source
                <span className="story-source-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            </div>
          </li>
        ))}
      </ol>

      {remaining > 0 && (
        <div className="load-more-row">
          <button
            type="button"
            className="load-more-toggle"
            onClick={handleLoadMore}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                Finding more stories
                <span className="load-more-cursor" aria-hidden="true">
                  ▌
                </span>
              </>
            ) : (
              `+ ${nextBatchSize} more ${nextBatchSize === 1 ? "story" : "stories"}`
            )}
          </button>
        </div>
      )}
    </>
  );
}
