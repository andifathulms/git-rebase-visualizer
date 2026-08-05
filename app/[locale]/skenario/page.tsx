import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SCENARIOS } from '@/data/scenarios'
import { LOCALES, isLocale } from '@/lib/i18n/locales'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function ScenarioLibrary({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="label">Perpustakaan skenario</p>
      <h1 className="mt-2 font-display text-3xl uppercase tracking-tight">Mulai dari sini</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink/75">
        Setiap skenario adalah skrip perintah, bukan snapshot — dijalankan ulang saat dibuka, jadi
        keadaannya tidak mungkin berbeda dari apa yang perintahnya benar-benar lakukan.
      </p>

      <ul className="mt-8 space-y-4">
        {SCENARIOS.map((scenario) => (
          <li key={scenario.id} className="border border-ink/20 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg uppercase tracking-[0.08em]">{scenario.title}</h2>
              <code className="font-mono text-[11px] text-faded">{scenario.id}</code>
            </div>
            <p className="mt-2 max-w-2xl leading-relaxed text-ink/75">{scenario.lesson}</p>
            <p className="mt-3 font-mono text-xs text-ink/70">
              Lalu coba: <span className="text-stamp">{scenario.next.command}</span> —{' '}
              {scenario.next.why}
            </p>
            <Link
              href={`/${params.locale}/repo?skenario=${scenario.id}`}
              className="mt-4 inline-block border border-catalogue px-3 py-1 font-display text-[11px] uppercase tracking-[0.16em] text-catalogue"
            >
              Buka di repositori
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={`/${params.locale}`}
        className="mt-10 inline-block font-mono text-xs text-catalogue underline"
      >
        ← kembali
      </Link>
    </main>
  )
}
