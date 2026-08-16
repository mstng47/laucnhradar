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
          <li
            className={`story${justRevealedFrom !== null && index >= justRevealedFrom ? " story-just-added" : ""}`}
            key={entry.id}
          >
            <div className="story-head">
              <span className="story-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
                <span className="story-index-total"> / {total}</span>
              </span>
              <a
                className="story-headline"
                href={entry.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {entry.headline}
              </a>
            </div>

            <p className="story-summary">{entry.what_happened}</p>

            <div className="story-angle">
              <span className="story-angle-label">Why it matters</span>
              <p>{entry.why_it_matters}</p>
            </div>

            <div className="story-meta">
              {entry.new_terms?.length > 0 && (
                <div className="chips">
                  {entry.new_terms.map((term) => (
                    <span key={term.term} className="chip" title={term.definition}>
                      {term.term}
                    </span>
                  ))}
                </div>
              )}
              <a
                className="story-source"
                href={entry.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                <span>{entry.source}</span>
                {Number.isFinite(entry.article_read_minutes) && (
                  <span>· {entry.article_read_minutes} min</span>
                )}
                <span className="story-source-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
              <SaveButton
                id={entry.id}
                headline={entry.headline}
                url={entry.url}
                source={entry.source}
                digestDate={entry.digest_date}
              />
              <DeepDive text={entry.deep_dive} />
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
