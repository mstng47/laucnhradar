import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";

// Switched from JetBrains Mono to IBM Plex Mono for one reason: JetBrains
// Mono's zero has a dot baked into the base glyph, and its "zero" OpenType
// feature only offers a slashed alternate on top of that (per JetBrains'
// own OpenType-features doc — there's no toggle back to a plain zero).
// That reads badly in "01 / 05" story indices and on-page dates. IBM Plex
// Mono's default zero (no feature flags needed) is a plain oval, and it's
// still the same "engineering monospace" register as JetBrains Mono. Max
// weight is 700, not 800 — see the three call sites in globals.css that
// were dropped from 800 to 700 to match what this family actually ships.
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-ibm-plex-mono",
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
    <html lang="en" className={ibmPlexMono.variable}>
      <body>
        <div className="bg-fixed" aria-hidden="true" />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
