import Link from "next/link";

export default function SiteHeader({ subtitle, meta }) {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          <span>LaunchRadar</span>
        </Link>
        {subtitle && <p className="eyebrow">{subtitle}</p>}
        {meta && <div className="meta-bar">{meta}</div>}
      </div>
    </header>
  );
}
