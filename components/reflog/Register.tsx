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
    <section className="flex min-h-0 flex-col border border-ink/20">
      <header className="border-b border-ink/20 px-3 py-2">
        <span className="label">{t.register}</span>
      </header>

      {orphans.length > 0 ? (
        <div className="border-b border-ink/20 bg-board px-3 py-2">
          <p className="label mb-1">
            {t.boxesWithoutCards} ({orphans.length})
          </p>
          <p className="mb-2 text-[11px] leading-relaxed text-ink/70">{t.orphanHelp}</p>
          <ul className="space-y-1">
            {orphans.map((oid) => (
              <li key={oid} className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-faded">{shortOid(oid)}</span>
                <button
                  type="button"
                  onClick={() => onRecover(oid)}
                  className="border border-catalogue px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.14em] text-catalogue hover:bg-catalogue hover:text-board"
                >
                  {t.recover}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ol className="min-h-0 flex-1 overflow-y-auto divide-y divide-ink/10">
        {entries.length === 0 ? (
          <li className="px-3 py-2 font-mono text-xs text-faded">{t.noMovements}</li>
        ) : (
          entries.map((entry, index) => (
            <li key={`${entry.ref}-${index}-${entry.timestamp}`} className="px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xs text-ink">
                  {entry.after ? shortOid(entry.after) : '—'}
                </span>
                <span className="font-display text-[10px] uppercase tracking-[0.14em] text-catalogue">
                  {entry.ref === 'HEAD' ? 'HEAD' : shortRef(entry.ref)}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-ink/70">
                <span className="font-mono">{entry.operation}</span> — {entry.message}
              </p>
              {entry.before && entry.before !== entry.after ? (
                <p className="mt-0.5 font-mono text-[10px] text-faded">
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
