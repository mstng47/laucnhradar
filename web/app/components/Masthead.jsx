import Logo from "./Logo";

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

// The one hero moment on every page — nameplate left, tagline + date
// right — before anything page-specific starts. Serif nameplate on
// purpose (an old-paper masthead, not a modern app header), but split
// left/right rather than centred: the logo mark earns its place back
// here specifically to anchor that left side.
export default function Masthead() {
  return (
    <div className="masthead container">
      <div className="masthead-row">
        <div className="masthead-brand">
          <Logo size={34} />
          <h1 className="masthead-wordmark">Sift</h1>
        </div>
        <div className="masthead-writing">
          <p className="masthead-tagline">
            The day&apos;s most important developments — distilled to what matters, delivered
            fresh every morning.
          </p>
          <p className="masthead-date">{todayFormatted()}</p>
        </div>
      </div>
      <div className="masthead-rule-thick" />
      <div className="masthead-rule-thin" />
    </div>
  );
}
