import "./globals.css";

export const metadata = {
  title: "LaunchRadar",
  description: "Daily digest of new AI tool launches",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
