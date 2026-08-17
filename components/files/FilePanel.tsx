'use client'

/**
 * The working tree, editable. File content is real here (PRD §6.6), so this is
 * where conflicts come from and where a resolution is made.
 *
 * Editing is not a git operation and is not dressed up as one: every edit is
 * recorded as a `write` line, which is clearly not a git command, and nothing
 * enters the object store until `add` and `commit`.
 */
import { useState } from 'react'
import { hasConflictMarkers } from '@/lib/git/merge3'
import { filePaths, type FileMap } from '@/lib/git/tree'
import type { Locale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'

export function FilePanel({
  worktree,
  index,
  conflicts,
  onWrite,
  locale,
}: {
  worktree: FileMap
  index: FileMap
  conflicts: readonly string[]
  onWrite: (path: string, lines: string[]) => void
  locale: Locale
}) {
  const t = UI[locale]
  const paths = filePaths(worktree)
  const [open, setOpen] = useState<string | null>(paths[0] ?? null)
  const [draftPath, setDraftPath] = useState('')

  const active = open && worktree[open] ? open : (paths[0] ?? null)

  const staged = (path: string) => {
    const a = index[path]
    const b = worktree[path]
    if (a === undefined || b === undefined) return a === b
    return a.length === b.length && a.every((line, i) => line === b[i])
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <span className="label">{t.worktree}</span>
        <span className="text-label text-muted">{t.notAGitCommand}</span>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-ink/10 px-3 py-2">
        {paths.map((path) => (
          <button
            key={path}
            type="button"
            onClick={() => setOpen(path)}
            className={`border px-2 py-1 font-mono text-label transition-colors ${
              path === active
                ? 'border-ink bg-kraft text-ink'
                : 'border-ink/25 text-muted hover:border-ink/50 hover:text-ink'
            } ${conflicts.includes(path) ? 'text-stamp' : ''}`}
          >
            {path}
            {!staged(path) ? <span className="ml-1 text-catalogue">•</span> : null}
          </button>
        ))}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const path = draftPath.trim()
            if (!path) return
            onWrite(path, [''])
            setOpen(path)
            setDraftPath('')
          }}
        >
          <input
            value={draftPath}
            onChange={(event) => setDraftPath(event.target.value)}
            placeholder={t.newFile}
            aria-label={t.newFile}
            className="w-28 border border-dashed border-ink/30 bg-transparent px-2 py-1 font-mono text-label outline-none placeholder:text-muted/70"
          />
        </form>
      </div>

      {active ? (
        <>
          {conflicts.includes(active) ? (
            <p className="border-b border-stamp/40 bg-stamp-tint px-3 py-2 text-note leading-relaxed text-stamp">
              {t.conflictHelp} <code>add {active}</code>.
            </p>
          ) : null}
          <textarea
            key={active}
            defaultValue={(worktree[active] ?? []).join('\n')}
            onBlur={(event) => onWrite(active, event.target.value.split('\n'))}
            spellCheck={false}
            aria-label={active}
            className={`min-h-[11rem] flex-1 resize-none bg-transparent px-3 py-2.5 font-mono text-note leading-relaxed outline-none ${
              hasConflictMarkers(worktree[active] ?? []) ? 'text-stamp' : 'text-ink'
            }`}
          />
          <p className="border-t border-ink/10 px-3 py-1.5 text-label text-muted">
            {t.savesOnBlur} <code>add</code>.
          </p>
        </>
      ) : (
        <p className="px-3 py-3 font-mono text-note text-muted">{t.noFiles}</p>
      )}
    </section>
  )
}
