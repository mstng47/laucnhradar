import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";

// Grotesk everywhere for nav, body and headlines — see the "no serif"
// rationale in globals.css's opening comment. Playfair Display is the
// one deliberate exception: an old-newspaper-style display serif, used
// nowhere but the masthead nameplate/tagline (see Masthead.jsx), where a
// grotesk wordmark can't read as "old newspaper" no matter how large.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata = {
  title: "Sift",
  description: "Your daily briefing, distilled to what matters",
};

// Read on a phone, so scale to the device width and allow zooming.
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <div className="bg-fixed" aria-hidden="true" />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
