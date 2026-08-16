import Link from "next/link";

// The end of the briefing, inside the white panel — not a separate dark
// footer bar. Same quiet treatment on every page via ContentFrame. Also
// where About/Contact live now: pages for someone learning what Sift is,
// not part of the header a daily reader sees every morning (see the note
// on NAV in SiteHeader).
export default function SignOff() {
  return (
    <footer className="sign-off container">
      <p className="sign-off-about">
        Everything that moved in tech this morning. Nothing that didn&apos;t.
      </p>
      <nav className="sign-off-nav">
        <Link href="/archive">Archive</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      <p className="sign-off-note">Generated fresh every morning.</p>
    </footer>
  );
}
