'use client'

/**
 * What is actually inside the selected box.
 *
 * Clicking a commit used to change nothing but a stroke width, which left the
 * most-asked beginner question — "why did *that* hash change?" — unanswerable
 * from the screen. Showing the tree and the parents side by side answers it: a
 * rebased commit has the same tree as its original and a different parent, and
 * that alone is why the number is different.
 *
 * Nothing is computed here. The commit and its tree are read back out of the
 * store; reachability arrives already traversed. CLAUDE.md invariant 13.
 */
import { shortOid, type Oid } from '@/lib/hash'
import { shortRef, type RefName } from '@/lib/git/refs'
import { requireCommit } from '@/lib/git/store'
import type { Repository } from '@/lib/git/state'
import { filePaths, readTree } from '@/lib/git/tree'
import type { Locale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'

export function CommitInspector({
  repo,
  oid,
  refs,
  reachable,
  onSelect,
  onClose,
  locale,
}: {
  repo: Repository
  oid: Oid | null
  refs: readonly RefName[]
  reachable: boolean
  onSelect: (oid: Oid) => void
  onClose: () => void
  locale: Locale
}) {
  const t = UI[locale]

  if (oid === null) {
    return (
      <section className="panel">
        <div className="panel-body">
          <p className="prose-note">{t.inspectorEmpty}</p>
        </div>
      </section>
    )
  }

  const commit = requireCommit(repo.store, oid)
  const files = filePaths(readTree(repo.store, commit.tree))

  return (
    <section className="panel" aria-label={t.inspectorTitle}>
      <header className="panel-head">
        <span className="label">{t.inspectorTitle}</span>
        <button type="button" onClick={onClose} className="btn-quiet px-2 py-1">
          {t.close}
        </button>
      </header>

      <div className="panel-body space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[15px] text-ink">{shortOid(oid)}</span>
          <span className="text-[14px] leading-snug text-ink">
            {commit.message.split('\n')[0]}
          </span>
        </div>

        {!reachable ? (
          <p className="border-l-2 border-faded bg-shelf/40 px-3 py-2 text-[12px] leading-relaxed text-muted">
            {t.inspectorUnreachable}
          </p>
        ) : null}

        <dl className="grid gap-x-4 gap-y-2 text-[12px] sm:grid-cols-[8rem_minmax(0,1fr)]">
          <dt className="label">{t.inspectorFullOid}</dt>
          <dd className="break-all font-mono text-muted">{oid}</dd>

          <dt className="label">{t.inspectorParents}</dt>
          <dd className="font-mono">
            {commit.parents.length === 0 ? (
              <span className="text-muted">{t.inspectorNoParents}</span>
            ) : (
              <span className="flex flex-wrap gap-2">
                {commit.parents.map((parent) => (
                  <button
                    key={parent}
                    type="button"
                    onClick={() => onSelect(parent)}
                    className="text-catalogue underline decoration-catalogue/40 underline-offset-2 hover:decoration-catalogue"
                  >
                    {shortOid(parent)}
                  </button>
                ))}
              </span>
            )}
          </dd>

          <dt className="label">{t.inspectorTree}</dt>
          <dd className="font-mono text-muted">
            {shortOid(commit.tree)}
            {files.length > 0 ? <span className="text-ink"> · {files.join(' ')}</span> : null}
          </dd>

          <dt className="label">{t.inspectorRefs}</dt>
          <dd>
            {refs.length === 0 ? (
              <span className="font-mono text-muted">{t.inspectorNoRefs}</span>
            ) : (
              <span className="flex flex-wrap gap-1.5">
                {refs.map((ref) => (
                  <span
                    key={ref}
                    className="border border-catalogue px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.12em] text-catalogue"
                  >
                    {shortRef(ref)}
                  </span>
                ))}
              </span>
            )}
          </dd>
        </dl>
      </div>
    </section>
  )
}
