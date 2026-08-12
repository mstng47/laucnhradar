export default function PageIntro({ eyebrow, meta }) {
  return (
    <div className="page-intro container">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      {meta && <div className="meta-bar">{meta}</div>}
    </div>
  );
}
