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

export default function Masthead() {
  return (
    <div className="masthead container">
      <span className="masthead-brand">Sift</span>
      <span className="masthead-date">{todayFormatted()}</span>
    </div>
  );
}
