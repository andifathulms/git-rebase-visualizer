/**
 * The one footer, rendered from the locale layout so every page has it.
 *
 * Two things share a single bottom bar and one seam: the project's attribution
 * on the left — credit to Learn Git Branching, which PRD §1 asks be given
 * warmly and prominently — and the maker's mark on the right. They are kept
 * apart because they are different kinds of statement: one is what this project
 * owes, the other is who made it. Neither should read as the other.
 */
import { MakerSignature } from '@/components/site/MakerSignature'
import type { Locale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = UI[locale]

  return (
    <footer className="mt-8 border-t border-ink/15">
      <div className="mx-auto flex max-w-[100rem] flex-col gap-x-8 gap-y-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p className="max-w-prose text-label leading-relaxed text-muted">
          {t.prior}{' '}
          <a
            className="text-catalogue underline decoration-catalogue/40 underline-offset-2 hover:decoration-catalogue"
            href="https://learngitbranching.js.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            learngitbranching.js.org
          </a>
        </p>

        <MakerSignature madeBy={t.madeBy} />
      </div>
    </footer>
  )
}
