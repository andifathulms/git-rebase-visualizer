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
 *
 * `fontSize` replaces Tailwind's default scale wholesale (it sits on `theme`,
 * not `theme.extend`) — `text-xs`/`text-sm`/`text-base`/etc. are gone, and so
 * is the ratio-built default ladder. Four steps, derived from
 * TYPE-SCALE-MEASUREMENT.md's histogram of the 89 `text-[Npx]` call sites this
 * scale replaces, not from a type-scale ratio:
 *
 * - `label` (12px) — the floor `CLAUDE.md` sets ("12px is the floor for
 *   anything a reader has to read"). Everything that measured below it (9px,
 *   10px, 11px, 11.5px — 17 call sites) is raised to it; everything that
 *   measured at 12px (20 call sites) already sat here. Catalogue-card labels,
 *   buttons, chips, badges, and small chrome.
 * - `note` (13px) — the second cluster: 12.5px, 13px, and 14px collapsed
 *   in (34 call sites total), all within a pixel of each other and doing the
 *   same job — secondary/detail text, oids, help copy.
 * - `body` (15px) — reading prose and the command line, exactly where the
 *   histogram already put most of both (10 call sites, unchanged).
 * - `lede` (17px) — opening paragraphs and scenario titles, the
 *   least-used and most prominent step (3 call sites, unchanged).
 *
 * Five more steps carry over the handful of call sites that already used
 * Tailwind's *default* scale (`text-sm`/`text-xl`/`text-2xl`/`text-3xl`/
 * `text-4xl`/`text-6xl`) rather than an arbitrary value — outside
 * TYPE-SCALE-MEASUREMENT.md's histogram, but a wholesale replacement removes
 * the default scale too, so these are named at the exact pixel-equivalent of
 * what they replace (no value invented, none of these eight call sites
 * changes size), so the section headings and hero on the landing/scenario/
 * comparison pages don't go unstyled:
 *
 * - `lead` (20px, was `text-xl`) — the home hero's lead paragraph.
 * - `heading` (24px, was `text-2xl`) — the three landing-page section h2s.
 * - `title` (30px, was `text-3xl`) — the banding/skenario page h1s.
 * - `display` (36px, was `text-4xl`/`sm:text-4xl`) — the home hero h1's base
 *   size, and the banding/skenario h1s' size from `sm:` up.
 * - `hero` (60px, was `sm:text-6xl`) — the home hero h1 from `sm:` up.
 *
 * `CommitGraph.tsx`'s one `text-sm` (the empty-shelf message, 14px) folds
 * into `note` rather than getting a tenth step for one call site — it was
 * already a pixel off `note` and sits in the same secondary-text register.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './data/**/*.{ts,tsx}'],
  theme: {
    fontSize: {
      label: ['12px', { lineHeight: '1.2' }],
      note: ['13px', { lineHeight: '1.35' }],
      body: ['15px', { lineHeight: '1.6' }],
      lede: ['17px', { lineHeight: '1.6' }],
      lead: ['20px', { lineHeight: '1.5' }],
      heading: ['24px', { lineHeight: '1.25' }],
      title: ['30px', { lineHeight: '1.15' }],
      display: ['36px', { lineHeight: '1.05' }],
      hero: ['60px', { lineHeight: '1.05' }],
    },
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
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
}

export default config
