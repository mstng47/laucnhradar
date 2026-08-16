import ContentFrame from "../components/ContentFrame";
import PageIntro from "../components/PageIntro";

export const metadata = {
  title: "About · Sift",
  description: "About Sift",
};

// Stub page — nav needed a working /about link ahead of real copy being
// written; content here is intentionally minimal until that happens.
export default function About() {
  return (
    <ContentFrame>
      <PageIntro eyebrow="About" />
      <main className="container">
        <p className="stub-copy">
          Sift is an automated daily briefing, personalized for one reader. It pulls the day&apos;s
          most important developments, filters them down to what actually matters, and writes it
          up fresh every morning.
        </p>
      </main>
    </ContentFrame>
  );
}
