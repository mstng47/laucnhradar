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

// The one hero moment on every page — wordmark left, tagline + date
// collapsed into a single quiet line on the right. Smaller and less
// newspaper-flag-like than before on purpose: this is a product's
// identity mark, not a broadsheet nameplate, so the wordmark stays
// confident without dominating, and the tagline no longer runs as its
// own large italic sentence competing with it.
export default function Masthead() {
  return (
    <div className="masthead container">
      <div className="masthead-row">
        <div className="masthead-brand">
          <Logo size={30} />
          <h1 className="masthead-wordmark">Sift</h1>
        </div>
        <p className="masthead-meta">
          <span className="masthead-tagline">Selected for you</span>
          <span className="meta-dot">·</span>
          <span className="masthead-date">{todayFormatted()}</span>
        </p>
      </div>
      <div className="masthead-rule-thick" />
      <div className="masthead-rule-thin" />
    </div>
  );
}
