import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Comparison } from '@/components/compare/Comparison'
import { SiteHeader } from '@/components/site/SiteHeader'
import { LOCALES, isLocale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function ComparePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale
  const t = UI[locale]
  const en = locale === 'en'

  return (
    <>
      <SiteHeader locale={locale} path="/banding" />

      <main id="main" className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <p className="label">{t.compare}</p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight sm:text-4xl">
          {en ? 'Two ways to integrate' : 'Dua cara menggabungkan'}
        </h1>
        <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-muted">
          {en
            ? 'The same starting state, two integrations side by side. Look at the shape of the history, then look at the file content — the second one is the surprise.'
            : 'Keadaan awal yang sama, dua integrasi berdampingan. Perhatikan bentuk riwayatnya, lalu perhatikan isi filenya — yang kedua itu kejutannya.'}
        </p>

        <div className="mt-10">
          <Comparison locale={locale} />
        </div>

        <Link href={`/${locale}/repo`} className="btn-secondary mt-10 px-4 py-2">
          {en ? 'Try it yourself in the sandbox' : 'Coba sendiri di sandbox'}
        </Link>
      </main>
    </>
  )
}
