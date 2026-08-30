// The "cover information" of a briefing — restrained on purpose: date,
// reader name, story count, read time, 2-3 focus labels, and anchors to
// this page's own sections. No progress bar, no streaks, no charts, no
// backend-derived state — everything here comes from props the page
// already has (see web/app/page.jsx etc.) or is hardcoded per route
// (focusLabels), not from the AI pipeline or a new database read.
//
// Same markup at every width — only the CSS (globals.css, .rail and its
// children) reflows this from a compact horizontal header on mobile/
// tablet into a vertical sticky sidebar on desktop.
export default function BriefingRail({
  date,
  name,
  storyCount,
  readMinutes,
  focusLabels,
  hasBriefing,
  hasLaunches,
  hasRadar,
}) {
  return (
    <aside className="rail" aria-label="Briefing overview">
      <p className="rail-date">{date}</p>
      <p className="rail-name">{name}</p>

      <dl className="rail-stats">
        <div className="rail-stat">
          <dt>Stories</dt>
          <dd>{storyCount}</dd>
        </div>
        <div className="rail-stat">
          <dt>Read time</dt>
          <dd>{readMinutes} min</dd>
        </div>
      </dl>

      {focusLabels?.length > 0 && (
        <ul className="rail-focus">
          {focusLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      )}

      {(hasBriefing || hasLaunches || hasRadar) && (
        <nav className="rail-nav" aria-label="Sections in this briefing">
          {hasBriefing && <a href="#briefing">Briefing</a>}
          {hasLaunches && <a href="#launches">Launches</a>}
          {hasRadar && <a href="#radar">Radar</a>}
        </nav>
      )}
    </aside>
  );
}
