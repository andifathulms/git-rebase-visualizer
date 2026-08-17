'use client'

/**
 * The register: every ref movement, chronological, append-only in appearance as
 * well as in fact. PRD §9.
 *
 * The recovery button is the real move, not a shortcut — it creates a branch at
 * the commit, exactly as you would at a terminal, and the command it runs is
 * shown so the gesture transfers.
 */
import { shortOid } from '@/lib/hash'
import type { ReflogEntry } from '@/lib/git/reflog'
import { shortRef } from '@/lib/git/refs'
import type { Locale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'

export function Register({
  entries,
  orphans,
  onRecover,
  locale,
}: {
  entries: readonly ReflogEntry[]
  orphans: readonly string[]
  onRecover: (oid: string) => void
  locale: Locale
}) {
  const t = UI[locale]
  return (
    <section className="panel">
      <header className="panel-head">
        <span className="label">{t.register}</span>
      </header>

      {orphans.length > 0 ? (
        <div className="border-b border-ink/10 bg-shelf/40 px-3 py-2.5">
          <p className="label mb-1">
            {t.boxesWithoutCards} ({orphans.length})
          </p>
          <p className="mb-2 text-note leading-relaxed text-muted">{t.orphanHelp}</p>
          <ul className="space-y-1">
            {orphans.map((oid) => (
              <li key={oid} className="flex items-center justify-between gap-2">
                <span className="font-mono text-note text-muted">{shortOid(oid)}</span>
                <button
                  type="button"
                  onClick={() => onRecover(oid)}
                  className="btn-secondary px-2 py-1"
                >
                  {t.recover}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ol className="min-h-0 max-h-[26rem] flex-1 divide-y divide-ink/10 overflow-y-auto">
        {entries.length === 0 ? (
          <li className="px-3 py-2.5 font-mono text-note text-muted">{t.noMovements}</li>
        ) : (
          entries.map((entry, index) => (
            <li key={`${entry.ref}-${index}-${entry.timestamp}`} className="px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-note text-ink">
                  {entry.after ? shortOid(entry.after) : '—'}
                </span>
                <span className="font-display text-label uppercase tracking-[0.12em] text-catalogue">
                  {entry.ref === 'HEAD' ? 'HEAD' : shortRef(entry.ref)}
                </span>
              </div>
              <p className="mt-1 text-note leading-snug text-muted">
                <span className="font-mono">{entry.operation}</span> — {entry.message}
              </p>
              {entry.before && entry.before !== entry.after ? (
                <p className="mt-0.5 font-mono text-label text-muted">
                  {locale === 'en' ? 'from' : 'dari'} {shortOid(entry.before)}
                </p>
              ) : null}
            </li>
          ))
        )}
      </ol>
    </section>
  )
}
