import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";

// One monospace family for the whole site — nav, body, headlines and
// the masthead. Cascadia Mono/Code (the Windows Terminal default) isn't
// on Google Fonts, so JetBrains Mono stands in for it: same "modern
// terminal" family of coding fonts, comparable weight range and
// legibility at body-copy sizes.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-jetbrains-mono",
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
    <html lang="en" className={jetbrainsMono.variable}>
      <body>
        <div className="bg-fixed" aria-hidden="true" />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
