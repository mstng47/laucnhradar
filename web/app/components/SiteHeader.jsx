"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const NAV = [
  { href: "/", label: "Briefing" },
  { href: "/archive", label: "Archive" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
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
    </header>
  );
}
