/**
 * The maker's mark. A quiet credit, not a badge.
 *
 * Everything identifying lives in the two constants below, so updating a
 * handle or adding a platform is one line and touches nothing else.
 *
 * The year is read at build time. The site is a static export, so "now" is
 * whenever the last deploy ran — which is the only sense in which a page with
 * no server can know the date.
 */

const MAKER = {
  name: 'Andi Fathul Mukminin',
  portfolio: 'https://andifathulms.github.io/en/',
} as const

type IconProps = { readonly className?: string }

/**
 * 18px marks on a 24 viewBox. Brand marks are solid because that is how they
 * are recognised; the globe and Instagram are drawn, so they are stroked.
 */
function GlobeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
        <circle cx={12} cy={12} r={9} />
        <ellipse cx={12} cy={12} rx={4} ry={9} />
        <path d="M3.2 9.2h17.6M3.2 14.8h17.6" />
      </g>
    </svg>
  )
}

function GitHubIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z"
      />
    </svg>
  )
}

function LinkedInIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.64h.05c.53-1 1.83-2.06 3.76-2.06 4.02 0 4.76 2.65 4.76 6.1V21h-4v-5.44c0-1.3-.02-2.97-1.81-2.97-1.81 0-2.09 1.42-2.09 2.88V21h-4V9Z"
      />
    </svg>
  )
}

function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" className={className}>
      <rect
        x={3}
        y={3}
        width={18}
        height={18}
        rx={5}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <circle cx={12} cy={12} r={4.2} fill="none" stroke="currentColor" strokeWidth={1.6} />
      <circle cx={17.2} cy={6.8} r={1.2} fill="currentColor" />
    </svg>
  )
}

const LINKS = [
  { label: 'Portfolio', href: MAKER.portfolio, Icon: GlobeIcon },
  { label: 'GitHub', href: 'https://github.com/andifathulms', Icon: GitHubIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/andifathulmukminin/', Icon: LinkedInIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/andifathulms/', Icon: InstagramIcon },
] as const

export function MakerSignature({ madeBy }: { madeBy: string }) {
  const year = new Date().getFullYear()

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-muted">
      <p>
        {madeBy}{' '}
        <a
          href={MAKER.portfolio}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline decoration-ink/30 underline-offset-2 transition-colors hover:decoration-catalogue"
        >
          {MAKER.name}
        </a>{' '}
        <span aria-hidden="true">·</span>{' '}
        <span className="font-mono tabular-nums">© {year}</span>
      </p>

      <ul className="flex items-center gap-0.5">
        {LINKS.map(({ label, href, Icon }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="inline-flex h-8 w-8 items-center justify-center text-muted transition-colors hover:bg-shelf/60 hover:text-ink"
            >
              <Icon />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
