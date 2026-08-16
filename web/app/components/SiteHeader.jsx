"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";

// The header is what a reader sees every morning using the product, not
// a marketing site's nav bar — it only needs the two things that's about:
// today's briefing (the brand mark itself, linking home) and the archive
// of past ones. About/Contact are marketing-site pages, not part of the
// daily habit, so they live in the footer (see SignOff) instead.
const NAV = [
  { href: "/archive", label: "Archive" },
  { href: "/saved", label: "Saved" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="header-frame">
        <div className="header-frame-inner">
          <div className="container header-bar">
            <Link href="/" className="brand">
              <Logo />
              Sift
            </Link>
            <nav className="main-nav">
              {NAV.map(({ href, label }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`}>
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
