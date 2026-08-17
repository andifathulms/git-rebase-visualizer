'use client'

/**
 * The repository page. Holds the session, runs lines through the engine, and
 * renders. It computes nothing about git itself — every derived value comes
 * from lib/git or lib/layout. CLAUDE.md invariant 13.
 *
 * The four side panels used to stack in a 18rem rail, which meant the reflog —
 * the panel that carries the recovery lesson — was usually below the fold and
 * usually missed. They are tabs now, all four kept mounted so a half-built todo
 * list survives a glance at the peer, and the two facts worth interrupting for
 * (an orphan appeared; HEAD moved) are promoted out of the rail into the status
 * strip and a banner.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CommandBar, type OutputLine, type Prefill } from '@/components/command/CommandBar'
import { FilePanel } from '@/components/files/FilePanel'
import { CommitGraph, type Graft } from '@/components/graph/CommitGraph'
import { BOX_HEIGHT, boxTop } from '@/components/graph/geometry'
import { Legend } from '@/components/graph/Legend'
import { Register } from '@/components/reflog/Register'
import { TodoPanel } from '@/components/rebase/TodoPanel'
import { RemotePanel } from '@/components/remote/RemotePanel'
import { CommitInspector } from '@/components/repo/CommitInspector'
import { SiteHeader } from '@/components/site/SiteHeader'
import { GitError } from '@/lib/git/errors'
import type { Commit } from '@/lib/git/objects'
import { allCommits } from '@/lib/git/query'
import { orphanedCommits, reachable } from '@/lib/git/reachable'
import { refsAt as refsAtOid, resolveHead, shortRef, type RefName } from '@/lib/git/refs'
import { runLine, writeLine } from '@/lib/git/session'
import { count } from '@/lib/git/store'
import { emptyRepository, type GitEvent, type Repository } from '@/lib/git/state'
import { layoutGraph } from '@/lib/layout/lanes'
import { saveSession } from '@/lib/share/session'
import { decodeScript, encodeScript } from '@/lib/share/url'
import { findScenario, type Scenario } from '@/data/scenarios'
import type { Locale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'
import type { Oid } from '@/lib/hash'

const START = ['write notes.txt "first line"', 'add notes.txt', 'commit -m "first"']

/** Remembers only that the orientation note was read. No session state. */
const ORIENTED_KEY = 'grs:oriented'

type Rail = 'files' | 'remote' | 'rebase' | 'register'

export function Workbench({
  locale,
  initialScript,
}: {
  locale: Locale
  initialScript?: readonly string[]
}) {
  const t = UI[locale]
  const [script, setScript] = useState<string[]>([])
  const [output, setOutput] = useState<OutputLine[]>([])
  const [highlighted, setHighlighted] = useState<ReadonlySet<Oid>>(new Set())
  const [selected, setSelected] = useState<Oid | null>(null)
  const [copied, setCopied] = useState(false)
  const [graft, setGraft] = useState<Graft | null>(null)
  const [rail, setRail] = useState<Rail>('files')
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const [oriented, setOriented] = useState(true)
  const nextId = useRef(0)
  const runCount = useRef(0)
  const graphScrollRef = useRef<HTMLDivElement>(null)
  const scrolledForRun = useRef(0)

  // Because the engine is deterministic, the script is the state: replaying it
  // rebuilds a byte-identical repository, which is what makes a shared link
  // trustworthy.
  const repo: Repository = useMemo(
    () => script.reduce((current, line) => runLine(current, line).repo, emptyRepository()),
    [script],
  )

  // DESIGN-REWORK.md §4: mirrored so app/[locale]/error.tsx can recover the
  // session's command lines after a render-time throw takes this component
  // out — a crash loses the mounted tree, not sessionStorage.
  useEffect(() => saveSession(script), [script])

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
        // The graft animation is driven by what the engine reports it copied,
        // never by guessing from the shape of the graph.
        const copies = result.events.flatMap((event) =>
          event.type === 'commits-replaced' ? [...event.pairs] : [],
        )
        runCount.current += 1
        setGraft(copies.length > 0 ? { pairs: copies, run: runCount.current } : null)

        for (const event of result.events) {
          if (event.type === 'message') say(event.tone, event.text[locale])
          if (event.type === 'conflict') {
            say('warn', `${locale === 'en' ? 'Conflict' : 'Konflik'}: ${event.paths.join(', ')}`)
            setRail('files')
          }
          if (event.type === 'commits-orphaned') {
            say(
              'warn',
              `${event.oids.length} ${
                locale === 'en'
                  ? 'object(s) now have no card:'
                  : 'objek sekarang tanpa kartu:'
              } ${event.oids.map((oid) => oid.slice(0, 7)).join(', ')}`,
            )
          }
        }
      } catch (error) {
        say('error', error instanceof GitError ? error.text[locale] : String(error))
      }
    },
    [repo, say, locale],
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

    // Read after mount, so the server and the first client render agree.
    setOriented(window.localStorage?.getItem(ORIENTED_KEY) === '1')
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

  // DESIGN-REWORK.md §2: the graph panel is height-capped below, so a long
  // rebase can push its new boxes out of the visible area. The engine
  // already reports what it copied (graft.pairs) — scroll to the midpoint of
  // the whole replayed span, not just its deepest row, so a multi-commit
  // rebase isn't left with its earliest new box clipped above the fold.
  useEffect(() => {
    if (!graft || graft.run === scrolledForRun.current) return
    const container = graphScrollRef.current
    if (!container) return
    const newOids = new Set(graft.pairs.map((pair) => pair.to))
    const rows = layout.nodes.filter((node) => newOids.has(node.oid)).map((node) => node.row)
    scrolledForRun.current = graft.run
    if (rows.length === 0) return
    const spanMid = boxTop((Math.min(...rows) + Math.max(...rows)) / 2)
    container.scrollTo({
      top: Math.max(0, spanMid + BOX_HEIGHT / 2 - container.clientHeight / 2),
      behavior: 'smooth',
    })
  }, [graft, layout])

  const orphans = useMemo(() => orphanedCommits(repo), [repo])
  const headOid = resolveHead(repo.refs, repo.head) ?? null
  const headRef = repo.head.type === 'attached' ? repo.head.ref : null

  // A selection only survives while its object is still on the graph.
  const inspected = selected !== null && commitMap.has(selected) ? selected : null

  function dismissOrientation() {
    setOriented(true)
    window.localStorage?.setItem(ORIENTED_KEY, '1')
  }

  function share() {
    const url = `${window.location.origin}${window.location.pathname}${encodeScript(script)}`
    window.history.replaceState(null, '', encodeScript(script))
    void navigator.clipboard?.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const tabs: readonly { readonly key: Rail; readonly label: string; readonly badge?: number }[] = [
    { key: 'files', label: t.tabFiles, badge: repo.pending?.conflicts.length },
    { key: 'remote', label: t.tabRemote },
    { key: 'rebase', label: t.tabRebase },
    { key: 'register', label: t.tabRegister, badge: orphans.length },
  ]

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        locale={locale}
        path="/repo"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              title={t.resetHelp}
              onClick={() => {
                setScript([])
                setOutput([])
                setHighlighted(new Set())
                setSelected(null)
                setGraft(null)
              }}
              className="btn-quiet px-2.5 py-1"
            >
              {t.reset}
            </button>
            <button type="button" title={t.shareHelp} onClick={share} className="btn-secondary px-2.5 py-1">
              {copied ? t.shared : t.share}
            </button>
          </div>
        }
      />

      <main
        id="main"
        className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-4 px-4 py-4 sm:px-6"
      >
        {/* The three numbers that describe the repository, each explained on
            hover — the counts meant nothing to a first-time reader. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip" title={t.objectsHelp}>
            <span className="text-ink">{count(repo.store)}</span> {t.objects}
          </span>
          <span className="chip" title={t.orphansHelp}>
            <span className="text-ink">{orphans.length}</span> {t.orphans}
          </span>
          <span className="chip" title={t.headHelp}>
            {headRef ? (
              <>
                HEAD <span className="text-catalogue">→</span>{' '}
                <span className="text-ink">{shortRef(headRef)}</span>
              </>
            ) : (
              t.detached
            )}
          </span>
        </div>

        {!oriented ? (
          <aside className="panel border-l-2 border-l-catalogue">
            <div className="panel-body flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="label">{t.orientationTitle}</p>
                <p className="mt-1.5 max-w-prose text-note leading-relaxed text-ink/85">
                  {t.orientationBody}
                </p>
              </div>
              <button type="button" onClick={dismissOrientation} className="btn-quiet px-3 py-1.5">
                {t.orientationDismiss}
              </button>
            </div>
          </aside>
        ) : null}

        {scenario ? (
          <aside className="panel border-l-2 border-l-catalogue">
            <div className="panel-body">
              <p className="label">
                {t.scenarioLabel} — {scenario.title[locale]}
              </p>
              <p className="mt-1.5 max-w-prose text-note leading-relaxed text-ink/85">
                {scenario.lesson[locale]}
              </p>
              <p className="mt-2 text-note text-muted">
                {t.thenTry}{' '}
                <button
                  type="button"
                  // Offers the line; the user still presses enter. PRD §6.8.
                  onClick={() =>
                    setPrefill((current) => ({
                      line: scenario.next.command,
                      n: (current?.n ?? 0) + 1,
                    }))
                  }
                  className="border border-stamp/40 bg-stamp-tint px-2 py-0.5 font-mono text-note text-stamp"
                >
                  {scenario.next.command}
                </button>{' '}
                — {scenario.next.why[locale]}
              </p>
            </div>
          </aside>
        ) : null}

        {orphans.length > 0 ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-faded bg-paper px-4 py-2.5 text-note text-muted">
            <span>
              <span className="font-mono text-ink">{orphans.length}</span> {t.orphanBanner}
            </span>
            <button
              type="button"
              onClick={() => setRail('register')}
              className="text-catalogue underline decoration-catalogue/40 underline-offset-2 hover:decoration-catalogue"
            >
              {t.openRegister}
            </button>
          </p>
        ) : null}

        <div className="grid flex-1 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <section className="panel">
              <header className="panel-head">
                <span className="label">{t.graphTitle}</span>
                <Legend locale={locale} />
              </header>
              <div
                ref={graphScrollRef}
                className="min-h-[24rem] max-h-[32rem] overflow-auto p-3 lg:max-h-[40vh]"
              >
                <CommitGraph
                  layout={layout}
                  commits={commitMap}
                  refsAt={decorations}
                  headRef={headRef}
                  headOid={headOid}
                  highlighted={highlighted}
                  selected={inspected}
                  onSelect={setSelected}
                  graft={graft}
                  locale={locale}
                />
              </div>
              <p className="border-t border-ink/10 px-3 py-1.5 text-label text-muted">
                {t.legendHint} {t.scrollHint}
              </p>
            </section>

            <CommitInspector
              repo={repo}
              oid={inspected}
              refs={inspected ? (decorations.get(inspected) ?? []) : []}
              reachable={inspected ? live.has(inspected) : false}
              onSelect={setSelected}
              onClose={() => setSelected(null)}
              locale={locale}
            />

            <CommandBar
              output={output}
              history={script}
              onSubmit={submit}
              prefill={prefill}
              locale={locale}
            />
          </div>

          {/* All four stay mounted: switching tabs must not throw away a
              half-built todo list or a file being edited. */}
          <div className="flex min-w-0 flex-col lg:sticky lg:top-[3.5rem]">
            <div
              role="tablist"
              aria-label={t.graphTitle}
              className="flex flex-wrap items-center gap-1 border-b border-ink/15"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  id={`rail-tab-${tab.key}`}
                  aria-selected={rail === tab.key}
                  aria-controls={`rail-panel-${tab.key}`}
                  onClick={() => setRail(tab.key)}
                  className={`tab ${rail === tab.key ? 'tab-active' : ''}`}
                >
                  {tab.label}
                  {tab.badge ? (
                    <span className="border border-catalogue px-1 font-mono text-label leading-4 text-catalogue">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="mt-3 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
              <div
                role="tabpanel"
                id="rail-panel-files"
                aria-labelledby="rail-tab-files"
                hidden={rail !== 'files'}
              >
                <FilePanel
                  worktree={repo.worktree}
                  index={repo.index}
                  conflicts={repo.pending?.conflicts ?? []}
                  onWrite={(path, lines) => submit(writeLine(path, lines))}
                  locale={locale}
                />
              </div>
              <div
                role="tabpanel"
                id="rail-panel-remote"
                aria-labelledby="rail-tab-remote"
                hidden={rail !== 'remote'}
              >
                <RemotePanel repo={repo} onRun={submit} locale={locale} />
              </div>
              <div
                role="tabpanel"
                id="rail-panel-rebase"
                aria-labelledby="rail-tab-rebase"
                hidden={rail !== 'rebase'}
              >
                <TodoPanel repo={repo} onRun={submit} locale={locale} />
              </div>
              <div
                role="tabpanel"
                id="rail-panel-register"
                aria-labelledby="rail-tab-register"
                hidden={rail !== 'register'}
              >
                <Register
                  entries={[...repo.reflog].reverse()}
                  orphans={orphans}
                  onRecover={(oid) => submit(`branch rescued-${oid.slice(0, 7)} ${oid}`)}
                  locale={locale}
                />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-2 max-w-prose text-label leading-relaxed text-muted">{t.honest}</p>
      </main>
    </div>
  )
}
