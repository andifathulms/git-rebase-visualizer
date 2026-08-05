import Link from 'next/link'
import { LOCALES, type Locale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'

const LOCALE_NAMES: Record<Locale, string> = { en: 'EN', id: 'ID' }

/**
 * One header across every page, so "where am I and what else is here" never has
 * to be re-learned. `path` is the sub-route within the locale ('' for home), so
 * the language switch lands on the same page rather than dumping the reader
 * back at the start.
 */
export function SiteHeader({
  locale,
  path,
  actions,
}: {
  locale: Locale
  path: '' | '/repo' | '/skenario' | '/banding'
  actions?: React.ReactNode
}) {
  const t = UI[locale]

  const links = [
    { href: '/repo', label: t.navSandbox },
    { href: '/skenario', label: t.scenarios },
    { href: '/banding', label: t.compare },
  ] as const

  return (
    <header className="sticky top-0 z-20 border-b border-ink/15 bg-board/95 backdrop-blur">
      <a
        href="#main"
        className="absolute left-2 top-2 z-30 -translate-y-16 bg-ink px-3 py-2 font-display text-[11px] uppercase tracking-[0.14em] text-paper transition-transform focus:translate-y-0"
      >
        {t.skipToMain}
      </a>

      <div className="mx-auto flex max-w-[100rem] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link
          href={`/${locale}`}
          className="font-display text-[13px] uppercase leading-tight tracking-[0.1em] text-ink sm:text-[15px] sm:tracking-[0.14em]"
        >
          Git Rebase Simulator
        </Link>

        <nav aria-label={t.navHome} className="flex items-center gap-1">
          {links.map((link) => {
            const active = link.href === path
            return (
              <Link
                key={link.href}
                href={`/${locale}${link.href}`}
                aria-current={active ? 'page' : undefined}
                className={`px-2.5 py-1 font-display text-[11px] uppercase tracking-[0.14em] transition-colors ${
                  active ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {actions}
          <div
            className="flex items-center border border-ink/20"
            role="group"
            aria-label={t.language}
          >
            {LOCALES.map((option) => (
              <Link
                key={option}
                href={`/${option}${path}`}
                hrefLang={option}
                aria-current={option === locale ? 'true' : undefined}
                className={`px-2 py-1 font-mono text-[11px] leading-none transition-colors ${
                  option === locale ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
              >
                {LOCALE_NAMES[option]}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
