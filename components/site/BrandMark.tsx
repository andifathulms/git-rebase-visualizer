/**
 * The product mark, inline so it costs no request and stays crisp at 22px.
 *
 * It is the app's own lesson drawn at icon scale: a dashed box on the left —
 * the commit that is still there and no longer reachable — and beside it the
 * solid new commit with a ref chip pointing at it. Same statement the graph
 * makes, same statement the legend explains.
 *
 * The literal hex here is deliberate and is the one exception to the no-raw-hex
 * rule (CLAUDE.md, Conventions). These are not interface colours drawn from the
 * semantic scale; they are a fixed logo with its own palette, and it has to
 * render identically in the header, the favicon and the app icon. Recolouring
 * it with `kraft`/`catalogue` would make the mark drift away from the PNG and
 * SVG masters in the brand kit, which no build step can catch.
 *
 * Masters: exports/svg/rebase-icon-*.svg. `app/icon.svg` is the small-size
 * form of this same drawing, with the chip dropped per the kit's rules.
 */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#1E1D19" />
      <rect
        x="16"
        y="42"
        width="30"
        height="24"
        rx="4"
        fill="none"
        stroke="#EBE7DC88"
        strokeWidth="2.5"
        strokeDasharray="4 4"
      />
      <rect x="54" y="34" width="32" height="26" rx="4" fill="#B5865A" />
      <rect x="60" y="20" width="20" height="10" rx="2" fill="#2C4C6E" />
      <line x1="70" y1="30" x2="70" y2="34" stroke="#2C4C6E" strokeWidth="2.5" />
    </svg>
  )
}
