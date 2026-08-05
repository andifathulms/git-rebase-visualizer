import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Comparison } from '@/components/compare/Comparison'
import { LOCALES, isLocale } from '@/lib/i18n/locales'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function ComparePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="label">Banding</p>
      <h1 className="mt-2 font-display text-3xl uppercase tracking-tight">
        Dua cara menggabungkan
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink/75">
        Keadaan awal yang sama, dua integrasi berdampingan. Perhatikan bentuk riwayatnya, lalu
        perhatikan isi filenya.
      </p>

      <div className="mt-8">
        <Comparison />
      </div>

      <Link
        href={`/${params.locale}/repo`}
        className="mt-10 inline-block font-mono text-xs text-catalogue underline"
      >
        → coba sendiri di repositori
      </Link>
    </main>
  )
}
