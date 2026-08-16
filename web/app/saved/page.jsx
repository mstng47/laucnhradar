import Link from "next/link";
import ContentFrame from "../components/ContentFrame";
import PageIntro from "../components/PageIntro";
import SavedList from "../components/SavedList";

export const metadata = {
  title: "Saved · Sift",
  description: "Stories you've saved to read later.",
};

export default function Saved() {
  return (
    <ContentFrame>
      <p className="back-row container">
        <Link href="/" className="back-link">
          ← Today&apos;s briefing
        </Link>
      </p>

      <PageIntro eyebrow="Stories you've saved" />
      <main className="container">
        <SavedList />
      </main>
    </ContentFrame>
  );
}
