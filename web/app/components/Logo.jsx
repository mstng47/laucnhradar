// A bracket pair holding a single dot — [ • ] — one signal pulled out of
// noise, read literally rather than metaphorically. Replaces the earlier
// narrowing-bar-stack mark: that one worked, but it's the single most
// common shorthand for "filtering" in app icons generally, so next to a
// technical-newspaper wordmark it read as generic. Brackets are a
// character every reader of this site already recognises from code and
// citations, which fits the register better than another funnel/filter
// glyph would.
//
// Two other directions were built and set aside: the narrowing bar stack
// (the previous mark, evolved further), and a dot grid with one dot
// dropped below the line. Both are solid marks on their own; brackets won
// on legibility at 24px specifically — three shapes read faster than a
// six-plus-dot grid at that size, and the mark doesn't already exist
// on every other product's icon the way stacked bars do.
//
// Built from solid rectangles, not stroked paths, for the same reason the
// old mark was: thin strokes blur or vanish once this scales down to a
// 16px favicon, flat fills stay crisp at any size. Brackets in
// --text-soft (quiet, secondary to the wordmark beside it); the dot in
// --teal — the same "circle = the signal" convention the site's accent
// already carries everywhere else (the story index, "Why it matters"),
// so the mark and the rest of the interface read as one system. Still
// legible as a single flat shape if forced to one color: three even
// weight forms, no reliance on the two-tone split to read as [ • ].
export default function Logo({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="6" height="2.6" fill="var(--text-soft)" />
      <rect x="3" y="17.4" width="6" height="2.6" fill="var(--text-soft)" />
      <rect x="3" y="4" width="2.6" height="16" fill="var(--text-soft)" />
      <rect x="15" y="4" width="6" height="2.6" fill="var(--text-soft)" />
      <rect x="15" y="17.4" width="6" height="2.6" fill="var(--text-soft)" />
      <rect x="18.4" y="4" width="2.6" height="16" fill="var(--text-soft)" />
      <circle cx="12" cy="12" r="2.6" fill="var(--teal)" />
    </svg>
  );
}
