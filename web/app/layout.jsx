import { Inter } from "next/font/google";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";

// Grotesk sans everywhere — headlines and body share the same family now,
// just different weights, instead of a serif/sans pairing.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Sift",
  description: "Your daily AI briefing",
};

// Read on a phone, so scale to the device width and allow zooming.
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="app-shell">
          <SiteHeader />
          <div className="scroll-region">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
