import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RebaseDiagram } from '@/components/home/RebaseDiagram'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SCENARIOS } from '@/data/scenarios'
import { LOCALES, isLocale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

/**
 * The landing page has one job: someone who has never run `rebase` should
 * understand what this is, and what they are about to look at, before they
 * click anything. The order is deliberate — claim, picture, model, then how to
 * drive it.
 */
export default function Home({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale
  const t = UI[locale]

  const metaphors = [
    { title: t.metaphorBox, body: t.metaphorBoxBody },
    { title: t.metaphorCard, body: t.metaphorCardBody },
    { title: t.metaphorOrphan, body: t.metaphorOrphanBody },
  ]

  const steps = [
    { title: t.stepOne, body: t.stepOneBody },
    { title: t.stepTwo, body: t.stepTwoBody },
    { title: t.stepThree, body: t.stepThreeBody },
  ]

  return (
    <>
      <SiteHeader locale={locale} path="" />

      <main id="main" className="mx-auto max-w-5xl px-6 pb-20">
        <section className="py-14 sm:py-20">
          <p className="label">{t.heroKicker}</p>
          <h1 className="mt-3 max-w-[20ch] font-display text-4xl uppercase leading-[1.05] tracking-tight sm:text-6xl">
            {t.heroTitle}
          </h1>
          <p className="mt-6 max-w-prose text-xl leading-relaxed">{t.heroLead}</p>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-muted">{t.heroPlain}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={`/${locale}/repo`} className="btn-primary px-6 py-2.5 text-[12px]">
              {t.enter}
            </Link>
            <Link href={`/${locale}/skenario`} className="btn-secondary px-5 py-2.5 text-[12px]">
              {t.scenarios}
            </Link>
            <Link href={`/${locale}/banding`} className="btn-quiet px-5 py-2.5 text-[12px]">
              {t.compare}
            </Link>
          </div>
        </section>

        <section className="border-t border-ink/15 py-12">
          <RebaseDiagram locale={locale} />
        </section>

        <section className="border-t border-ink/15 py-12">
          <h2 className="font-display text-2xl uppercase tracking-tight">{t.metaphorTitle}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {metaphors.map((item) => (
              <div key={item.title} className="panel">
                <div className="panel-body">
                  <h3 className="font-display text-[13px] uppercase tracking-[0.1em] text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-ink/15 py-12">
          <h2 className="font-display text-2xl uppercase tracking-tight">{t.stepsTitle}</h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="font-mono text-[13px] text-catalogue">0{index + 1}</span>
                <h3 className="mt-1 font-display text-[13px] uppercase tracking-[0.1em]">
                  {step.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8 border-l-2 border-catalogue bg-paper px-5 py-4">
            <p className="max-w-prose text-[15px] leading-relaxed">{t.newToGit}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SCENARIOS.slice(0, 3).map((scenario) => (
                <li key={scenario.id}>
                  <Link
                    href={`/${locale}/repo?skenario=${scenario.id}`}
                    className="btn-secondary px-3 py-1.5"
                  >
                    {scenario.title[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-ink/15 py-12">
          <h2 className="font-display text-2xl uppercase tracking-tight">{t.honestTitle}</h2>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-muted">{t.honest}</p>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-muted">
            {t.prior}{' '}
            <a
              className="text-catalogue underline decoration-catalogue/40 underline-offset-2 hover:decoration-catalogue"
              href="https://learngitbranching.js.org"
              target="_blank"
              rel="noreferrer"
            >
              learngitbranching.js.org
            </a>
          </p>
        </section>
      </main>
    </>
  )
}
