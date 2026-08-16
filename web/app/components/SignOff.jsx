import Link from "next/link";

// The end of the briefing, inside the white panel — not a separate dark
// footer bar. Same quiet treatment on every page via ContentFrame.
export default function SignOff() {
  return (
    <footer className="sign-off container">
      <p className="sign-off-about">
        Sift is an automated daily briefing, personalized for one reader.
      </p>
      <nav className="sign-off-nav">
        <Link href="/archive">Archive</Link>
      </nav>
      <p className="sign-off-note">Generated fresh every morning.</p>
    </footer>
  );
}
