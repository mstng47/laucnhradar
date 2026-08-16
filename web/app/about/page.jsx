import ContentFrame from "../components/ContentFrame";
import PageIntro from "../components/PageIntro";

export const metadata = {
  title: "About · Sift",
  description: "The tech news that actually affects your work, in plain English, every morning.",
};

// Stub page — nav needed a working /about link ahead of real copy being
// written; content here is intentionally minimal until that happens.
export default function About() {
  return (
    <ContentFrame>
      <PageIntro eyebrow="About" />
      <main className="container">
        <p className="stub-copy">
          The tech news that actually affects your work. Every morning, Sift pulls the day&apos;s
          most important developments, filters them down to what actually matters, and lays it
          out in plain English — five minutes, and you&apos;re caught up.
        </p>
        <p className="fine-print">
          Under the hood: an automated pipeline reads the day&apos;s coverage and writes each
          briefing fresh, with no human editor in the loop.
        </p>
      </main>
    </ContentFrame>
  );
}
