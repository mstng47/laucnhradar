import ContentFrame from "../components/ContentFrame";
import PageIntro from "../components/PageIntro";

export const metadata = {
  title: "Contact · Sift",
  description: "Contact",
};

// Stub page — nav needed a working /contact link ahead of a real contact
// channel being set up; content here is intentionally minimal until then.
export default function Contact() {
  return (
    <ContentFrame>
      <PageIntro eyebrow="Contact" />
      <main className="container">
        <p className="stub-copy">Sift is a personal project without a public contact channel yet.</p>
      </main>
    </ContentFrame>
  );
}
