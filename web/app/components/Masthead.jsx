// Today's date, not the briefing's own date — like a printed paper's
// masthead, this reads the same across every page/section on a given
// day, not just the latest briefing. UTC to match the rest of the
// site's date handling (see lib/format.js) and avoid day-shift bugs.
function todayFormatted() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date());
}

// The one hero moment on every page — nameplate, tagline, today's date —
// before anything page-specific starts. Centred and serif on purpose:
// an old-paper nameplate rather than another app header. No logo icon
// here deliberately — it already does its job as a compact mark in the
// nav bar above; next to a big serif wordmark it read as a modern app
// icon bolted onto a vintage one, working against the effect rather
// than for it.
export default function Masthead() {
  return (
    <div className="masthead container">
      <h1 className="masthead-wordmark">Sift</h1>
      <p className="masthead-tagline">
        Your daily AI briefing — distilled to what matters, written fresh every morning.
      </p>
      <div className="masthead-rule-thick" />
      <div className="masthead-rule-thin" />
      <p className="masthead-date">{todayFormatted()}</p>
    </div>
  );
}
