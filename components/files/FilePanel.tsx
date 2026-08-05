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

export function FilePanel({
  worktree,
  index,
  conflicts,
  onWrite,
}: {
  worktree: FileMap
  index: FileMap
  conflicts: readonly string[]
  onWrite: (path: string, lines: string[]) => void
}) {
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
    <section className="flex min-h-0 flex-col border border-ink/20">
      <header className="flex items-baseline justify-between border-b border-ink/20 px-3 py-2">
        <span className="label">Working tree</span>
        <span className="text-[10px] text-faded">bukan perintah git</span>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-ink/20 px-3 py-2">
        {paths.map((path) => (
          <button
            key={path}
            type="button"
            onClick={() => setOpen(path)}
            className={`border px-2 py-0.5 font-mono text-[11px] ${
              path === active ? 'border-ink bg-kraft text-ink' : 'border-ink/25 text-ink/70'
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
            placeholder="+ file baru"
            aria-label="Nama file baru"
            className="w-28 border border-dashed border-ink/30 bg-transparent px-2 py-0.5 font-mono text-[11px] outline-none placeholder:text-faded"
          />
        </form>
      </div>

      {active ? (
        <>
          {conflicts.includes(active) ? (
            <p className="border-b border-stamp/40 bg-stamp/5 px-3 py-1.5 text-[11px] text-stamp">
              Konflik. Hapus penanda <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>{' '}
              <code>=======</code> <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>, simpan isi yang
              benar, lalu <code>add {active}</code>.
            </p>
          ) : null}
          <textarea
            key={active}
            defaultValue={(worktree[active] ?? []).join('\n')}
            onBlur={(event) => onWrite(active, event.target.value.split('\n'))}
            spellCheck={false}
            aria-label={`Isi ${active}`}
            className={`min-h-[10rem] flex-1 resize-none bg-transparent px-3 py-2 font-mono text-xs leading-relaxed outline-none ${
              hasConflictMarkers(worktree[active] ?? []) ? 'text-stamp' : 'text-ink'
            }`}
          />
          <p className="border-t border-ink/20 px-3 py-1 text-[10px] text-faded">
            Perubahan tersimpan saat kursor meninggalkan kotak. Belum jadi objek sampai{' '}
            <code>add</code>.
          </p>
        </>
      ) : (
        <p className="px-3 py-3 font-mono text-xs text-faded">Belum ada file.</p>
      )}
    </section>
  )
}
