import SignOff from "./SignOff";

// The Intelligence Desk shell for the four briefing routes (/, /dawood,
// /archive/[date], /dawood/archive/[date] — see BriefingRail.jsx for
// what it renders). Deliberately not ContentFrame: no floating panel,
// no dark canvas behind it — the page itself is the warm cream, and
// `rail` + `children` sit directly on it, either stacked (mobile/
// tablet) or as a sticky sidebar + main column (desktop; see
// .briefing-shell in globals.css for the breakpoint). Every other page
// (Archive index, Saved, Email, About, Contact) still uses ContentFrame.
export default function BriefingLayout({ rail, children }) {
  return (
    <div className="briefing-canvas">
      <div className="briefing-shell">
        <div className="briefing-rail-slot">{rail}</div>
        <div className="briefing-main">{children}</div>
      </div>
      <SignOff />
    </div>
  );
}
