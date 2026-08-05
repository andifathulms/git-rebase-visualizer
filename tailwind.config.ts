import type { Config } from 'tailwindcss'

/**
 * Semantic tokens only — PRD §9. Components never use raw hex.
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
        kraft: '#C4A97D',
        ink: '#23211C',
        catalogue: '#2E5A7A',
        faded: '#8A8779',
        stamp: '#A8322B',
      },
      fontFamily: {
        mono: ['var(--font-azeret)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['var(--font-archivo)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-source)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
