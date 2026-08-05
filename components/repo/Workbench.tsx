'use client'

/**
 * The repository page. Holds the session, runs lines through the engine, and
 * renders. It computes nothing about git itself — every derived value comes
 * from lib/git or lib/layout. CLAUDE.md invariant 13.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CommandBar, type OutputLine } from '@/components/command/CommandBar'
import { FilePanel } from '@/components/files/FilePanel'
import { CommitGraph } from '@/components/graph/CommitGraph'
import { Register } from '@/components/reflog/Register'
import { TodoPanel } from '@/components/rebase/TodoPanel'
import { GitError } from '@/lib/git/errors'
import type { Commit } from '@/lib/git/objects'
import { allCommits } from '@/lib/git/query'
import { orphanedCommits, reachable } from '@/lib/git/reachable'
import { refsAt as refsAtOid, resolveHead, shortRef, type RefName } from '@/lib/git/refs'
import { runLine, writeLine } from '@/lib/git/session'
import { count } from '@/lib/git/store'
import { emptyRepository, type GitEvent, type Repository } from '@/lib/git/state'
import { layoutGraph } from '@/lib/layout/lanes'
import { decodeScript, encodeScript } from '@/lib/share/url'
import { findScenario, type Scenario } from '@/data/scenarios'
import type { Oid } from '@/lib/hash'

const START = [
  'write catatan.txt "baris pertama"',
  'add catatan.txt',
  'commit -m "awal"',
]

export function Workbench({ initialScript }: { initialScript?: readonly string[] }) {
  const [script, setScript] = useState<string[]>([])
  const [output, setOutput] = useState<OutputLine[]>([])
  const [highlighted, setHighlighted] = useState<ReadonlySet<Oid>>(new Set())
  const [selected, setSelected] = useState<Oid | null>(null)
  const [copied, setCopied] = useState(false)
  const nextId = useRef(0)

  // Because the engine is deterministic, the script is the state: replaying it
  // rebuilds a byte-identical repository, which is what makes a shared link
  // trustworthy.
  const repo: Repository = useMemo(
    () => script.reduce((current, line) => runLine(current, line).repo, emptyRepository()),
    [script],
  )

  const say = useCallback((kind: OutputLine['kind'], text: string) => {
    setOutput((lines) => [...lines, { id: nextId.current++, kind, text }])
  }, [])

  const submit = useCallback(
    (line: string) => {
      say('input', line)
      try {
        const result = runLine(repo, line)
        setScript((current) => [...current, line])
        setHighlighted(
          new Set(
            result.events
              .filter((event): event is Extract<GitEvent, { type: 'object-created' }> =>
                event.type === 'object-created',
              )
              .map((event) => event.oid),
          ),
        )
        for (const event of result.events) {
          if (event.type === 'message') say(event.tone, event.text)
          if (event.type === 'conflict') say('warn', `Konflik: ${event.paths.join(', ')}`)
          if (event.type === 'commits-orphaned') {
            say(
              'warn',
              `${event.oids.length} objek sekarang tanpa kartu: ${event.oids
                .map((oid) => oid.slice(0, 7))
                .join(', ')}`,
            )
          }
        }
      } catch (error) {
        say('error', error instanceof GitError ? error.message : String(error))
      }
    },
    [repo, say],
  )

  // A scenario, a shared link, or the starter history for a first visit.
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    const chosen = findScenario(new URLSearchParams(window.location.search).get('skenario') ?? '')
    if (chosen) setScenario(chosen)

    const shared = decodeScript(window.location.hash)
    setScript([...(initialScript ?? chosen?.script ?? shared ?? START)])
  }, [initialScript])

  const live = useMemo(() => reachable(repo), [repo])
  const commits = useMemo(() => allCommits(repo), [repo])
  const layout = useMemo(() => layoutGraph(commits, live), [commits, live])

  const commitMap = useMemo(() => {
    const map = new Map<Oid, Commit>()
    for (const commit of commits) map.set(commit.oid, commit)
    return map
  }, [commits])

  const decorations = useMemo(() => {
    const map = new Map<Oid, RefName[]>()
    for (const node of layout.nodes) map.set(node.oid, refsAtOid(repo.refs, node.oid))
    return map
  }, [layout, repo.refs])

  const orphans = useMemo(() => orphanedCommits(repo), [repo])
  const headOid = resolveHead(repo.refs, repo.head) ?? null
  const headRef = repo.head.type === 'attached' ? repo.head.ref : null

  function share() {
    const url = `${window.location.origin}${window.location.pathname}${encodeScript(script)}`
    window.history.replaceState(null, '', encodeScript(script))
    void navigator.clipboard?.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[100rem] flex-col gap-4 px-4 py-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink/20 pb-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-lg uppercase tracking-[0.16em]">Cangkok</span>
          <span className="font-mono text-xs text-faded">
            {count(repo.store)} objek · {orphans.length} yatim ·{' '}
            {headRef ? `HEAD → ${shortRef(headRef)}` : 'HEAD detached'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setScript([])
              setOutput([])
              setHighlighted(new Set())
            }}
            className="border border-ink/30 px-2 py-1 font-display text-[10px] uppercase tracking-[0.14em]"
          >
            Kosongkan
          </button>
          <button
            type="button"
            onClick={share}
            className="border border-catalogue px-2 py-1 font-display text-[10px] uppercase tracking-[0.14em] text-catalogue"
          >
            {copied ? 'Tersalin' : 'Bagikan URL'}
          </button>
        </div>
      </header>

      {scenario ? (
        <aside className="border-l-2 border-catalogue bg-board px-4 py-3">
          <p className="label">Skenario — {scenario.title}</p>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink/80">
            {scenario.lesson}
          </p>
          <p className="mt-2 font-mono text-xs text-ink/70">
            Lalu coba <span className="text-stamp">{scenario.next.command}</span> —{' '}
            {scenario.next.why}
          </p>
        </aside>
      ) : null}

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="min-h-[22rem] overflow-auto border border-ink/20 p-3">
            <CommitGraph
              layout={layout}
              commits={commitMap}
              refsAt={decorations}
              headRef={headRef}
              headOid={headOid}
              highlighted={highlighted}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
          <CommandBar output={output} history={script} onSubmit={submit} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <FilePanel
            worktree={repo.worktree}
            index={repo.index}
            conflicts={repo.pending?.conflicts ?? []}
            onWrite={(path, lines) => submit(writeLine(path, lines))}
          />
          <TodoPanel repo={repo} onRun={submit} />
          <Register
            entries={[...repo.reflog].reverse()}
            orphans={orphans}
            onRecover={(oid) => submit(`branch selamat-${oid.slice(0, 7)} ${oid}`)}
          />
        </div>
      </div>

      <footer className="border-t border-ink/20 pt-3 text-[11px] leading-relaxed text-ink/60">
        Hash di sini nyata dalam arti diturunkan dari isi objek dan konsisten secara internal —
        bukan identik dengan yang dihasilkan <code>git</code> di mesin Anda, karena git ikut
        memasukkan waktu committer dan identitas penulis. Cangkok memakai jam virtual supaya
        setiap sesi bisa diulang persis.{' '}
        <a
          className="text-catalogue underline"
          href="https://learngitbranching.js.org"
          target="_blank"
          rel="noreferrer"
        >
          Learn Git Branching
        </a>{' '}
        adalah tutorial yang lebih baik; ini sandbox.
      </footer>
    </div>
  )
}
