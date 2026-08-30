// Quiet eyebrow line for pages that aren't a briefing view (About,
// Contact, the archive index) — the four briefing routes (/, /dawood,
// /archive/[date], /dawood/archive/[date]) use BriefingLayout/
// BriefingRail instead, which carries a richer opening than this.
export default function PageIntro({ eyebrow }) {
  if (!eyebrow) return null;

  return (
    <div className="page-intro container">
      <p className="eyebrow">{eyebrow}</p>
    </div>
  );
}
