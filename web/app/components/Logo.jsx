// Rounded square, three stacked bars like a sieve — the middle bar has a
// gap with a small filled circle passing through it. Grey (--text-faint)
// for the frame/bars, accent teal for the circle, so the mark reads the
// same "circle = the thing being sifted" way the header/why-marker teal
// already does elsewhere on the page.
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
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="var(--text-faint)" strokeWidth="1.6" />
      <path d="M6.5 8H17.5" stroke="var(--text-faint)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.5 12H10.1" stroke="var(--text-faint)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.9 12H17.5" stroke="var(--text-faint)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.5 16H17.5" stroke="var(--text-faint)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.7" fill="var(--teal)" />
    </svg>
  );
}
