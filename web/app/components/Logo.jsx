// Three bars narrowing to one signal — the same "many things down to a
// few" idea as before, but as bold flat shapes with no enclosing square.
// The old mark (a rounded-square frame around thin stroked bars) reads as
// a generic app-icon template at a glance; dropping the frame and using
// solid fills instead of 1.6px strokes is what actually fixes that, since
// it's the frame + thin-stroke combination that reads as "placeholder
// icon", not the bar idea itself.
//
// Two other directions were considered and dropped: a funnel drawn as two
// converging diagonal lines, and stacked chevrons pointing down. Both rely
// on thin diagonal strokes, which blur or vanish once this is scaled down
// to a 16px favicon; flat horizontal bars stay crisp at any size because
// they're solid rectangles, not lines.
//
// Bars in --text-soft (quiet, secondary to the wordmark beside it); the
// bottom dot in --teal — the same "circle = the signal" convention the
// site's accent already carries everywhere else (the story index, "Your
// angle"), so the mark and the rest of the interface read as one system.
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
      <rect x="4" y="3.6" width="16" height="2.6" fill="var(--text-soft)" />
      <rect x="6.75" y="8.6" width="10.5" height="2.6" fill="var(--text-soft)" />
      <rect x="9.25" y="13.6" width="5.5" height="2.4" fill="var(--text-soft)" />
      <circle cx="12" cy="19.3" r="2.15" fill="var(--teal)" />
    </svg>
  );
}
