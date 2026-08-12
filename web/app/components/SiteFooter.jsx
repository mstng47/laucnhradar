import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-row">
        <p className="footer-about">
          LaunchRadar is an automated daily AI briefing, personalized for one reader.
        </p>
        <nav className="footer-nav">
          <Link href="/archive">Archive</Link>
          <Link href="/glossary">Glossary</Link>
        </nav>
        <p className="footer-note">Generated fresh every morning.</p>
      </div>
    </footer>
  );
}
