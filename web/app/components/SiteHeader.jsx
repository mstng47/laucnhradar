"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";

// The header is what a reader sees every morning using the product, not
// a marketing site's nav bar — it only needs what that's about: today's
// briefing, the archive of past ones, and saved stories. Home is listed
// explicitly alongside them rather than relying on the brand mark alone
// to imply it. About/Contact are marketing-site pages, not part of the
// daily habit, so they live in the footer (see SignOff) instead.

// Route roots for every profile besides Finn (who lives at "/"). Kept in
// sync by hand with the folders under web/app/ — with only one other
// profile this is simpler than deriving it from anywhere else, but it's
// the one place that has to be remembered if a third profile's routes
// are ever added. Without this, a reader on /dawood clicking "Archive"
// or the logo would silently land back on Finn's pages — exactly the
// "never mix Finn and Dawood content" bug this exists to prevent.
const PROFILE_ROUTE_ROOTS = ["/dawood"];

function currentProfileRoot(pathname) {
  return PROFILE_ROUTE_ROOTS.find((root) => pathname === root || pathname.startsWith(`${root}/`)) ?? "";
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const profileRoot = currentProfileRoot(pathname);
  const homeHref = profileRoot || "/";

  const NAV = [
    { href: homeHref, label: "Home", exact: true },
    { href: `${profileRoot}/archive`, label: "Archive" },
    { href: "/saved", label: "Saved" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="container header-bar">
        <Link href={homeHref} className="brand">
          <Logo />
          Sift
        </Link>
        <nav className="main-nav">
          {NAV.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`}>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
