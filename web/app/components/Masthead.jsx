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

// The one moment on every page that's about the product itself rather
// than whatever's on that page — logo, name, one line on what Sift is,
// today's date. Everything page-specific (item counts, "every past
// briefing", "about") lives below this in PageIntro, so this doesn't
// have to repeat or compete with it.
export default function Masthead() {
  return (
    <div className="masthead container">
      <div className="masthead-row">
        <div className="masthead-brand">
          <Logo size={30} />
          <span className="masthead-wordmark">Sift</span>
        </div>
        <span className="masthead-date">{todayFormatted()}</span>
      </div>
      <p className="masthead-tagline">
        Your daily AI briefing — distilled to what matters, written fresh every morning.
      </p>
    </div>
  );
}
