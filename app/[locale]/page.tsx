import Link from 'next/link'
import { LOCALES, isLocale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function Home({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const t = UI[params.locale]

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="label">Cangkok</p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-tight">
          Simulator sejarah git
        </h1>
      </div>

      <p className="text-lg leading-relaxed">{t.tagline}</p>

      <nav className="flex flex-wrap gap-3">
        <Link
          href={`/${params.locale}/repo`}
          className="border border-catalogue bg-catalogue px-5 py-2 font-display uppercase tracking-[0.18em] text-sm text-board"
        >
          {t.enter}
        </Link>
        <Link
          href={`/${params.locale}/skenario`}
          className="border border-catalogue px-5 py-2 font-display uppercase tracking-[0.18em] text-sm text-catalogue"
        >
          {t.scenarios}
        </Link>
        <Link
          href={`/${params.locale}/banding`}
          className="border border-catalogue px-5 py-2 font-display uppercase tracking-[0.18em] text-sm text-catalogue"
        >
          {t.compare}
        </Link>
      </nav>

      <div className="space-y-3 border-t border-ink/20 pt-6 text-sm text-ink/75">
        <p>
          {t.prior}{' '}
          <a
            className="text-catalogue underline"
            href="https://learngitbranching.js.org"
            target="_blank"
            rel="noreferrer"
          >
            learngitbranching.js.org
          </a>
        </p>
        <p>{t.honest}</p>
      </div>
    </main>
  )
}
