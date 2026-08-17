'use client'

/**
 * DESIGN-REWORK.md §4: no render-time error boundary existed anywhere under
 * app/ — GitError from a bad command is caught and printed in Workbench's
 * own try/catch, which is correct, but a *throw* during render (a bad prop
 * reaching CommitGraph, TodoPanel, or the layout engine) had nothing to
 * catch it and took the whole page down.
 *
 * The recovery this app can offer isn't generic. A session here is a list
 * of command lines, not a snapshot (Workbench.tsx) — so the honest recovery
 * is to show the lines that got the user here and offer to replay all but
 * the last one. Nothing is lost, the share link still encodes the same
 * script format, and the recovery demonstrates the append-only model this
 * project exists to teach rather than just apologising for breaking it.
 *
 * Next.js requires error boundaries to be Client Components and only passes
 * `error`/`reset` as props — no route params — so the locale is read back
 * out of the URL instead.
 */
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SiteHeader } from '@/components/site/SiteHeader'
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'
import { readSession } from '@/lib/share/session'
import { encodeScript } from '@/lib/share/url'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  const segment = pathname.split('/')[1] ?? ''
  const locale = isLocale(segment) ? segment : DEFAULT_LOCALE
  const t = UI[locale]

  const [script, setScript] = useState<string[] | null>(null)

  useEffect(() => {
    setScript(readSession())
    // eslint-disable-next-line no-console
    console.error(error)
  }, [error])

  function replay(lines: readonly string[]) {
    window.location.href = `/${locale}/repo${encodeScript(lines)}`
  }

  return (
    <>
      <SiteHeader locale={locale} path="" />
      <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16">
        <p className="label text-stamp">{t.errorTitle}</p>
        <p className="max-w-prose text-body leading-relaxed text-muted">{t.errorBody}</p>

        {script && script.length > 0 ? (
          <section className="panel">
            <header className="panel-head">
              <span className="label">{t.errorSessionLabel}</span>
            </header>
            <ol className="panel-body space-y-1 font-mono text-note text-ink">
              {script.map((line, index) => (
                <li key={index} className={index === script.length - 1 ? 'text-stamp' : undefined}>
                  {line}
                </li>
              ))}
            </ol>
            <div className="panel-body flex flex-wrap gap-2 border-t border-ink/10">
              {script.length > 1 ? (
                <button
                  type="button"
                  onClick={() => replay(script.slice(0, -1))}
                  className="btn-primary px-3 py-1.5"
                >
                  {t.errorReplayWithoutLast}
                </button>
              ) : null}
              <button type="button" onClick={() => replay(script)} className="btn-secondary px-3 py-1.5">
                {t.errorReplayAll}
              </button>
            </div>
          </section>
        ) : null}

        <button type="button" onClick={reset} className="btn-quiet self-start px-3 py-1.5">
          {t.errorTryAgain}
        </button>
      </main>
    </>
  )
}
