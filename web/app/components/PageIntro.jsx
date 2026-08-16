// Quiet eyebrow line for pages that aren't a briefing view (About,
// Contact, the archive index) — BriefingOpen carries the richer opening
// for pages that actually show a day's stories.
export default function PageIntro({ eyebrow }) {
  if (!eyebrow) return null;

  return (
    <div className="page-intro container">
      <p className="eyebrow">{eyebrow}</p>
    </div>
  );
}
