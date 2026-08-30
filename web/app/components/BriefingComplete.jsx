// Renders after the secondary sections in Briefing.jsx — the quiet
// finish line that makes the briefing feel finite rather than a feed
// that happens to stop. Deliberately understated: no icon, no count, no
// celebration.
export default function BriefingComplete() {
  return (
    <div className="briefing-complete">
      <p className="briefing-complete-title">
        <span className="briefing-complete-check" aria-hidden="true">
          ✓
        </span>
        You&apos;re caught up
      </p>
      <p className="briefing-complete-sub">Nothing else needs your attention today.</p>
    </div>
  );
}
