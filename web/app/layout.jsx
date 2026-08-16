import { Victor_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";

// Switched from IBM Plex Mono to Victor Mono for "personality" — semi-
// connected cursive italics and programming ligatures, the same register
// as Operator Mono (the commercial font this was asked for directly).
// Operator Mono itself isn't an option: it's a paid H&Co/Type Network
// license with no free or self-hostable distribution, so there's no
// legal way to embed it here. Victor Mono is free (SIL OFL), built for
// the same "cursive italic code font" niche, and is on Google Fonts so
// it drops into the same next/font pipeline as the fonts before it.
// Its default zero has no dot or slash — slashed variants exist only as
// opt-in stylistic sets (ss02-ss05) — so the zero-glyph fix still holds.
// Max weight is 700, same as the IBM Plex Mono it replaces, so the three
// call sites in globals.css that were already dropped from 800 to 700
// don't need to change again.
const victorMono = Victor_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-victor-mono",
  display: "swap",
});

export const metadata = {
  title: "Sift",
  description: "The five minutes that keep you current.",
};

// Read on a phone, so scale to the device width and allow zooming.
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={victorMono.variable}>
      <body>
        <div className="bg-fixed" aria-hidden="true" />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
