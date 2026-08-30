import { Victor_Mono, Geist } from "next/font/google";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";

// Victor Mono carried the whole site through the first version — every
// headline and paragraph, not just labels. Phase 1 of the redesign
// demoted it to a supporting role: dates, story numbers, source labels,
// reading time and other small-caps metadata only (see --font-mono in
// globals.css). It's free (SIL OFL) and on Google Fonts, and its default
// zero has no dot or slash — slashed variants exist only as opt-in
// stylistic sets (ss02-ss05).
const victorMono = Victor_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-victor-mono",
  display: "swap",
});

// Geist now carries everything meant to be read — headlines, body copy,
// buttons, nav (see --font-sans in globals.css). Also on Google Fonts,
// so it drops into the same next/font pipeline as Victor Mono above
// rather than adding a new dependency.
const geistSans = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist-sans",
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
    <html lang="en" className={`${victorMono.variable} ${geistSans.variable}`}>
      <body>
        <div className="bg-fixed" aria-hidden="true" />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
