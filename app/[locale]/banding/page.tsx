import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Comparison } from '@/components/compare/Comparison'
import { LOCALES, isLocale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function ComparePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const t = UI[params.locale]
  const en = params.locale === 'en'

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="label">{t.compare}</p>
      <h1 className="mt-2 font-display text-3xl uppercase tracking-tight">
        {en ? 'Two ways to integrate' : 'Dua cara menggabungkan'}
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink/75">
        {en
          ? 'The same starting state, two integrations side by side. Look at the shape of the history, then look at the file content.'
          : 'Keadaan awal yang sama, dua integrasi berdampingan. Perhatikan bentuk riwayatnya, lalu perhatikan isi filenya.'}
      </p>

      <div className="mt-8">
        <Comparison locale={params.locale} />
      </div>

      <Link
        href={`/${params.locale}/repo`}
        className="mt-10 inline-block font-mono text-xs text-catalogue underline"
      >
        {en ? '→ try it yourself in the repository' : '→ coba sendiri di repositori'}
      </Link>
    </main>
  )
}
