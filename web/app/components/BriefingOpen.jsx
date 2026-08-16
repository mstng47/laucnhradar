// Bridges the masthead and the story list. States plainly that this is
// today's briefing, that it holds a specific number of full stories, and
// that it's quick to read — the three things a reader should know before
// scrolling past it. The numeral deliberately reuses the same "count /
// total" language as each story's own "01 / 05" index below it, so this
// reads as the start of that same system rather than a separate stat
// block bolted on above it.
//
// mainCount can legitimately be 0 (a thin day with nothing for "What
// matters today") — a "00" numeral would read as broken, so that case
// falls back to a plain line instead of the big stat.
export default function BriefingOpen({ eyebrow, heading, mainCount, meta }) {
  return (
    <div className="open container">
      <p className="open-eyebrow">{eyebrow}</p>
      {mainCount > 0 ? (
        <div className="open-stat">
          <span className="open-count" aria-hidden="true">
            {String(mainCount).padStart(2, "0")}
          </span>
          <div className="open-stat-text">
            <h2 className="open-heading">{heading}</h2>
            {meta && <p className="open-meta">{meta}</p>}
          </div>
        </div>
      ) : (
        <p className="open-fallback">{meta}</p>
      )}
    </div>
  );
}
