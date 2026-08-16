import PageIntro from "../components/PageIntro";

export const metadata = {
  title: "About — Sift",
  description: "About Sift",
};

// Stub page — nav needed a working /about link ahead of real copy being
// written; content here is intentionally minimal until that happens.
export default function About() {
  return (
    <div className="content-frame">
      <div className="content-frame-inner">
        <PageIntro eyebrow="About" />
        <main className="container">
          <p className="stub-copy">
            Sift is an automated daily AI briefing, personalized for one reader. It pulls the
            day&apos;s AI news, filters it down to what actually matters, and writes it up fresh
            every morning.
          </p>
        </main>
      </div>
    </div>
  );
}
