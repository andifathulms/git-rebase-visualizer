import Link from 'next/link'
import { LOCALES, isLocale, type Locale } from '@/lib/i18n/locales'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

const COPY = {
  id: {
    tagline:
      'Rebase tidak memindahkan commit. Ia membuat commit baru — dengan hash baru — dan meninggalkan yang asli di rak.',
    enter: 'Buka repositori',
    prior:
      'Learn Git Branching adalah tutorial yang lebih baik dan lebih lengkap. Ini bukan tutorial; ini sandbox.',
    honest:
      'Hash di sini nyata dalam arti diturunkan dari isi objek dan konsisten secara internal — bukan identik dengan hash yang dihasilkan git di mesin Anda.',
  },
  en: {
    tagline:
      'Rebase does not move commits. It creates new ones — with new hashes — and leaves the originals on the shelf.',
    enter: 'Open the repository',
    prior:
      'Learn Git Branching is the better and more complete tutorial. This is not a tutorial; it is a sandbox.',
    honest:
      'Hashes here are real in the sense of being content-derived and internally consistent — not identical to what git would produce on your machine.',
  },
} satisfies Record<Locale, Record<string, string>>

export default function Home({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const t = COPY[params.locale]

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="label">Cangkok</p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-tight">
          Simulator sejarah git
        </h1>
      </div>

      <p className="text-lg leading-relaxed">{t.tagline}</p>

      <Link
        href={`/${params.locale}/repo`}
        className="w-fit border border-catalogue bg-catalogue px-5 py-2 font-display uppercase tracking-[0.18em] text-sm text-board"
      >
        {t.enter}
      </Link>

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
