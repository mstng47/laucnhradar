import Link from "next/link";
import ContentFrame from "../components/ContentFrame";
import PageIntro from "../components/PageIntro";

export const metadata = {
  title: "About · Sift",
  description: "Everything that moved in tech this morning. Nothing that didn't.",
};

// Stub page — nav needed a working /about link ahead of real copy being
// written; content here is intentionally minimal until that happens.
export default function About() {
  return (
    <ContentFrame>
      <PageIntro eyebrow="About" />
      <main className="container">
        <p className="stub-copy">
          Everything that moved in tech this morning. Nothing that didn&apos;t. Sift reads the
          day&apos;s coverage, cuts it down to what&apos;s actually worth your time, and lays it
          out in plain English. Read this, skip the rest. Prefer your inbox?{" "}
          <Link href="/email" className="text-link">
            Get Sift by email
          </Link>{" "}
          instead — pick your own days, time and timezone.
        </p>
        <p className="fine-print">
          Under the hood: an automated pipeline reads the day&apos;s coverage and writes each
          briefing fresh, with no human editor in the loop.
        </p>
      </main>
    </ContentFrame>
  );
}
