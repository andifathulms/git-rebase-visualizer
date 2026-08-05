import type { Config } from 'tailwindcss'

/**
 * Semantic tokens only — PRD §9. Components never use raw hex.
 *
 * PRD §9 fixes six colours: board, kraft, ink, catalogue, faded, stamp. Those
 * are unchanged. The additions here are not new colours in the design sense —
 * they are the same six made usable:
 *
 * - `paper` and `shelf` give the flat ground a surface hierarchy. A records
 *   room is a board with sheets on it; panels are sheets, recesses are shelf.
 * - `muted` exists because `faded` fails contrast as text (2.7:1 on board).
 *   `faded` keeps its single meaning — an unreachable object, present but
 *   inactive — and stops doubling as "small grey text".
 * - `-deep` variants are for a token drawn on top of another token where the
 *   base pair is too close to read: `stamp-deep` on kraft is 4.4:1 where
 *   `stamp` on kraft is 2.9:1. Same red, still reserved for the same two
 *   things.
 *
 * `stamp` is reserved for exactly two things: a changed hash and a destructive
 * operation. `catalogue` is reserved for pointers, including the drawn strings.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './data/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        board: '#E4E0D5',
        paper: '#F4F1E8',
        shelf: '#D5CFBF',
        kraft: '#C4A97D',
        'kraft-deep': '#9E8055',
        ink: '#23211C',
        muted: '#5B584D',
        catalogue: '#2E5A7A',
        'catalogue-deep': '#1F4059',
        'catalogue-tint': '#DEE6EC',
        faded: '#8A8779',
        stamp: '#A8322B',
        'stamp-deep': '#7C221D',
        'stamp-tint': '#F1E1DE',
      },
      fontFamily: {
        mono: ['var(--font-azeret)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['var(--font-archivo)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-source)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // A sheet resting on the board, not a floating web card.
        sheet: '0 1px 0 rgba(35, 33, 28, 0.05), 0 6px 16px -12px rgba(35, 33, 28, 0.45)',
        lift: '0 2px 0 rgba(35, 33, 28, 0.06), 0 12px 24px -14px rgba(35, 33, 28, 0.5)',
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
}

export default config
