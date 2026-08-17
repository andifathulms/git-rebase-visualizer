import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SCENARIOS } from '@/data/scenarios'
import { LOCALES, isLocale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default function ScenarioLibrary({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale
  const t = UI[locale]
  const en = locale === 'en'

  return (
    <>
      <SiteHeader locale={locale} path="/skenario" />

      <main id="main" className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        <p className="label">{en ? 'Scenario library' : 'Perpustakaan skenario'}</p>
        <h1 className="mt-3 font-display text-title uppercase tracking-tight sm:text-display">
          {en ? 'Start here' : 'Mulai dari sini'}
        </h1>
        <p className="mt-4 max-w-prose text-lede leading-relaxed text-muted">
          {en
            ? 'Each scenario is a script of commands, not a snapshot — it replays when you open it, so what you see cannot disagree with what the commands actually do. Every one stops just before the interesting command and names it.'
            : 'Setiap skenario adalah skrip perintah, bukan snapshot — dijalankan ulang saat dibuka, jadi keadaannya tidak mungkin berbeda dari apa yang perintahnya benar-benar lakukan. Semuanya berhenti tepat sebelum perintah yang menarik, dan menyebutkan namanya.'}
        </p>

        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {SCENARIOS.map((scenario) => (
            <li key={scenario.id} className="panel">
              <div className="panel-body flex h-full flex-col gap-3">
                <div>
                  <h2 className="font-display text-lede uppercase leading-snug tracking-[0.06em]">
                    {scenario.title[locale]}
                  </h2>
                  <code className="mt-1 block font-mono text-label text-muted">
                    {scenario.id}
                  </code>
                </div>

                <p className="text-body leading-relaxed text-muted">{scenario.lesson[locale]}</p>

                <p className="text-note leading-relaxed text-muted">
                  <span className="label">{t.thenTry}</span>{' '}
                  <code className="border border-stamp/40 bg-stamp-tint px-1.5 py-0.5 font-mono text-note text-stamp">
                    {scenario.next.command}
                  </code>{' '}
                  — {scenario.next.why[locale]}
                </p>

                <Link
                  href={`/${locale}/repo?skenario=${scenario.id}`}
                  className="btn-primary mt-auto self-start px-4 py-2"
                >
                  {en ? 'Open in the sandbox' : 'Buka di sandbox'}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
