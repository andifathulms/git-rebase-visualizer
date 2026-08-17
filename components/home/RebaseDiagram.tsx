/**
 * The landing-page explainer: the same four commits, before and after a rebase.
 *
 * The hashes in this drawing are not decoration and are not invented — the
 * script below is run through the real engine while this page is built, and the
 * numbers you see are the ones the sandbox itself would produce. A picture that
 * illustrated the lesson with made-up ids would be doing exactly what §2 of the
 * PRD criticises the incumbents for.
 *
 * This is a schematic, not the graph component: fixed lanes, four boxes, no
 * layout engine. The real thing is one click away.
 */
import { requireCommit } from '@/lib/git/store'
import { runLine } from '@/lib/git/session'
import { emptyRepository, type Repository } from '@/lib/git/state'
import { shortOid, type Oid } from '@/lib/hash'
import type { Locale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'

const SETUP = [
  'write notes.txt "one"',
  'add notes.txt',
  'commit -m "first"',
  'branch feature',
  'write main.txt "their work"',
  'add main.txt',
  'commit -m "main moved on"',
  'checkout feature',
  'write feature.txt "my work"',
  'add feature.txt',
  'commit -m "start"',
  'write feature.txt "my work|done"',
  'add feature.txt',
  'commit -m "finish"',
]

function play(lines: readonly string[]): Repository {
  return lines.reduce((repo, line) => runLine(repo, line).repo, emptyRepository())
}

/** Oldest first, by walking first parents from a ref. */
function chain(repo: Repository, ref: string): Oid[] {
  const walk: Oid[] = []
  let oid: Oid | undefined = repo.refs[ref]
  while (oid !== undefined) {
    walk.push(oid)
    oid = requireCommit(repo.store, oid).parents[0]
  }
  return walk.reverse()
}

const BOX_W = 86
const BOX_H = 30
const LANE = [14, 124]
const CARD_X = 226
const CARD_W = 104
const CARD_H = 24
const VIEW_W = 344
const VIEW_H = 194

/** Row 0 is the newest, drawn at the top. */
const rowY = (row: number) => 8 + (3 - row) * 48

function Box({
  lane,
  row,
  oid,
  tone,
}: {
  lane: 0 | 1
  row: number
  oid: Oid
  /** `fresh` is a hash that did not exist before the rebase — stamp red. */
  tone: 'live' | 'fresh' | 'stranded'
}) {
  const x = LANE[lane]
  const y = rowY(row)
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={BOX_W}
        height={BOX_H}
        rx={2}
        className={
          tone === 'stranded' ? 'fill-paper stroke-faded' : 'fill-kraft stroke-ink'
        }
        strokeWidth={1}
        strokeDasharray={tone === 'stranded' ? '3 3' : undefined}
      />
      <text
        x={x + 10}
        y={y + 20}
        className={`font-mono text-note ${
          tone === 'fresh' ? 'fill-stamp-deep' : tone === 'stranded' ? 'fill-faded' : 'fill-ink'
        }`}
      >
        {shortOid(oid)}
      </text>
    </g>
  )
}

function Edge({
  from,
  to,
  faint,
}: {
  from: { lane: 0 | 1; row: number }
  to: { lane: 0 | 1; row: number }
  faint?: boolean
}) {
  const x1 = LANE[from.lane] + BOX_W / 2
  const y1 = rowY(from.row) + BOX_H
  const x2 = LANE[to.lane] + BOX_W / 2
  const y2 = rowY(to.row)
  const mid = y1 + (y2 - y1) / 2
  const d =
    from.lane === to.lane
      ? `M ${x1} ${y1} L ${x2} ${y2}`
      : `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`
  return (
    <path
      d={d}
      fill="none"
      className={faint ? 'stroke-faded' : 'stroke-ink/70'}
      strokeWidth={faint ? 1 : 2}
      strokeDasharray={faint ? '3 3' : undefined}
    />
  )
}

/** A catalogue card and its string. Pointers are always catalogue blue. */
function Card({ lane, row, name }: { lane: 0 | 1; row: number; name: string }) {
  const y = rowY(row) + (BOX_H - CARD_H) / 2
  return (
    <g>
      <line
        x1={LANE[lane] + BOX_W}
        y1={rowY(row) + BOX_H / 2}
        x2={CARD_X}
        y2={y + CARD_H / 2}
        className="stroke-catalogue"
        strokeWidth={1.5}
      />
      <rect
        x={CARD_X}
        y={y}
        width={CARD_W}
        height={CARD_H}
        rx={2}
        className="fill-paper stroke-catalogue"
        strokeWidth={1}
      />
      <text
        x={CARD_X + 10}
        y={y + 16}
        className="fill-catalogue font-display text-label uppercase tracking-[0.12em]"
      >
        {name}
      </text>
    </g>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <figure className="panel">
      <figcaption className="panel-head">
        <span className="label">{title}</span>
      </figcaption>
      <div className="overflow-x-auto px-2 py-2">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width={VIEW_W}
          height={VIEW_H}
          role="presentation"
          className="h-auto w-full min-w-[300px]"
        >
          {children}
        </svg>
      </div>
    </figure>
  )
}

export function RebaseDiagram({ locale }: { locale: Locale }) {
  const t = UI[locale]

  const before = play(SETUP)
  const after = play([...SETUP, 'rebase main'])

  // [root, feature-start, feature-finish] and [root, main-moved].
  const [root, start, finish] = chain(before, 'refs/heads/feature')
  const moved = chain(before, 'refs/heads/main')[1]
  // [root, main-moved, start', finish'] — the two copies, with new hashes.
  const [, , startCopy, finishCopy] = chain(after, 'refs/heads/feature')

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/*
         * The feature chain keeps the left lane in both panels and main keeps
         * the right one, so the eye compares the same two positions rather than
         * re-reading the drawing. Cards sit right of every lane, which is also
         * the only arrangement where no string is drawn through a box.
         */}
        <Panel title={t.beforeRebase}>
          <Edge from={{ lane: 1, row: 2 }} to={{ lane: 1, row: 3 }} />
          <Edge from={{ lane: 0, row: 2 }} to={{ lane: 1, row: 3 }} />
          <Edge from={{ lane: 0, row: 1 }} to={{ lane: 0, row: 2 }} />
          <Box lane={1} row={3} oid={root} tone="live" />
          <Box lane={1} row={2} oid={moved} tone="live" />
          <Box lane={0} row={2} oid={start} tone="live" />
          <Box lane={0} row={1} oid={finish} tone="live" />
          <Card lane={1} row={2} name="main" />
          <Card lane={0} row={1} name="feature" />
        </Panel>

        <Panel title={t.afterRebase}>
          <Edge from={{ lane: 1, row: 2 }} to={{ lane: 1, row: 3 }} />
          <Edge from={{ lane: 1, row: 1 }} to={{ lane: 1, row: 2 }} />
          <Edge from={{ lane: 1, row: 0 }} to={{ lane: 1, row: 1 }} />
          <Edge from={{ lane: 0, row: 2 }} to={{ lane: 1, row: 3 }} faint />
          <Edge from={{ lane: 0, row: 1 }} to={{ lane: 0, row: 2 }} faint />
          <Box lane={0} row={2} oid={start} tone="stranded" />
          <Box lane={0} row={1} oid={finish} tone="stranded" />
          <Box lane={1} row={3} oid={root} tone="live" />
          <Box lane={1} row={2} oid={moved} tone="live" />
          <Box lane={1} row={1} oid={startCopy} tone="fresh" />
          <Box lane={1} row={0} oid={finishCopy} tone="fresh" />
          <Card lane={1} row={2} name="main" />
          <Card lane={1} row={0} name="feature" />
        </Panel>
      </div>

      <p className="max-w-prose text-body leading-relaxed text-muted">{t.diagramCaption}</p>
    </div>
  )
}
