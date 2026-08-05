'use client'

/**
 * The archive board: commits as boxes with accession numbers, refs as catalogue
 * cards with a drawn string to the box they describe. PRD §9.
 *
 * Nothing is computed here — the layout arrives from lib/layout and the
 * decorations from lib/git/query. This file places rectangles.
 * CLAUDE.md invariant 13. Colours are semantic Tailwind tokens, never raw hex.
 */
import type { Oid } from '@/lib/hash'
import { shortOid } from '@/lib/hash'
import type { Commit } from '@/lib/git/objects'
import { refKind, shortRef, type RefName } from '@/lib/git/refs'
import type { Layout } from '@/lib/layout/lanes'
import type { Locale } from '@/lib/i18n/locales'
import { UI } from '@/lib/i18n/ui'
import {
  BOX_HEIGHT,
  BOX_WIDTH,
  boxLeft,
  boxTop,
  canvasHeight,
  canvasWidth,
  cardLeft,
  CARD_WIDTH,
  centerX,
  centerY,
  edgePath,
} from './geometry'

/**
 * What the last command copied, so each new box can be drawn travelling out
 * from its original. PRD §9 "Motion".
 */
export interface Graft {
  readonly pairs: readonly { readonly from: string; readonly to: string }[]
  /** Bumped per command, so React restarts the animation on a repeat. */
  readonly run: number
}

export interface GraphProps {
  layout: Layout
  commits: ReadonlyMap<Oid, Commit>
  refsAt: ReadonlyMap<Oid, RefName[]>
  headRef: RefName | null
  headOid: Oid | null
  /** Objects the last command created — stamped, because the hash is new. */
  highlighted: ReadonlySet<Oid>
  onSelect?: (oid: Oid) => void
  selected?: Oid | null
  graft?: Graft | null
  locale: Locale
}

const CARD_HEIGHT = 26

export function CommitGraph({
  layout,
  commits,
  refsAt,
  headRef,
  headOid,
  highlighted,
  onSelect,
  selected,
  graft,
  locale,
}: GraphProps) {
  if (layout.rows === 0) {
    return (
      <p className="font-mono text-sm text-faded">
        {UI[locale].emptyShelf} <span className="text-ink">commit</span>.
      </p>
    )
  }

  const width = canvasWidth(layout.lanes)
  const height = canvasHeight(layout.rows)
  const cardX = cardLeft(layout.lanes)

  // Where each node sits, so a copy can start from its original's position.
  const place = new Map(layout.nodes.map((node) => [node.oid, node]))
  const copiedFrom = new Map((graft?.pairs ?? []).map((pair) => [pair.to, pair.from]))
  const replaced = new Set((graft?.pairs ?? []).map((pair) => pair.from))
  const order = new Map((graft?.pairs ?? []).map((pair, index) => [pair.to, index]))
  const STEP_MS = 260

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={locale === 'en' ? 'Commit graph' : 'Graf commit'}
      className="max-w-none"
    >
      {/* One shelf line per lane, behind everything. */}
      {Array.from({ length: layout.lanes }, (_, lane) => (
        <line
          key={`shelf-${lane}`}
          x1={centerX(lane)}
          y1={boxTop(0)}
          x2={centerX(lane)}
          y2={boxTop(layout.rows - 1) + BOX_HEIGHT}
          className="stroke-ink/15"
          strokeWidth={1}
        />
      ))}

      {layout.edges.map((edge) => (
        <path
          key={`${edge.from}-${edge.to}`}
          d={edgePath(edge.fromLane, edge.fromRow, edge.toLane, edge.toRow)}
          fill="none"
          className={edge.merge ? 'stroke-ink/40' : 'stroke-ink/70'}
          strokeWidth={edge.merge ? 1.5 : 2}
          strokeDasharray={edge.merge ? '4 3' : undefined}
        />
      ))}

      {layout.nodes.map((node) => {
        const commit = commits.get(node.oid)
        const refs = refsAt.get(node.oid) ?? []
        const detachedHere = headRef === null && headOid === node.oid
        const select = onSelect ? () => onSelect(node.oid) : undefined

        // A copied commit travels out from the box it was copied from; an
        // original that was just superseded fades. Both together are the point:
        // the new box appears *beside* the old one, which stays.
        const source = copiedFrom.get(node.oid)
        const from = source ? place.get(source) : undefined
        const delay = `${(order.get(node.oid) ?? 0) * STEP_MS}ms`

        const motion = from
          ? {
              className: 'graft-new',
              style: {
                animationDelay: delay,
                ['--graft-dx' as string]: `${boxLeft(from.lane) - boxLeft(node.lane)}px`,
                ['--graft-dy' as string]: `${boxTop(from.row) - boxTop(node.row)}px`,
              } as React.CSSProperties,
            }
          : replaced.has(node.oid)
            ? { className: 'graft-old', style: { animationDelay: delay } }
            : {}

        return (
          <g key={`${node.oid}-${graft?.run ?? 0}`} {...motion}>
            <rect
              x={boxLeft(node.lane)}
              y={boxTop(node.row)}
              width={BOX_WIDTH}
              height={BOX_HEIGHT}
              rx={2}
              // Unreachable is faded — present but inactive. Never red, never
              // styled as deleted. PRD §9, CLAUDE.md invariant 14.
              className={`${node.reachable ? 'fill-kraft stroke-ink' : 'fill-board stroke-faded'} ${
                select ? 'cursor-pointer' : ''
              }`}
              strokeWidth={selected === node.oid ? 2.5 : 1}
              strokeDasharray={node.reachable ? undefined : '3 3'}
              onClick={select}
            />
            <text
              x={boxLeft(node.lane) + 8}
              y={boxTop(node.row) + 22}
              onClick={select}
              // Stamp red is reserved for a changed hash and for destructive
              // operations; a freshly written object is exactly the first case.
              className={`font-mono text-[13px] ${
                highlighted.has(node.oid)
                  ? 'fill-stamp'
                  : node.reachable
                    ? 'fill-ink'
                    : 'fill-faded'
              } ${select ? 'cursor-pointer' : ''}`}
            >
              {shortOid(node.oid)}
            </text>
            {refs.length === 0 && !detachedHere ? (
              <text
                x={boxLeft(node.lane) + BOX_WIDTH + 10}
                y={boxTop(node.row) + 22}
                className={`font-sans text-[12px] ${node.reachable ? 'fill-ink/70' : 'fill-faded'}`}
              >
                {commit ? commit.message.split('\n')[0].slice(0, 24) : ''}
              </text>
            ) : null}

            {[...refs, ...(detachedHere ? ['HEAD-detached'] : [])].map((ref, index) => {
              const y = boxTop(node.row) + index * (CARD_HEIGHT + 4)
              const detached = ref === 'HEAD-detached'
              const attached = !detached && ref === headRef
              const filled = attached || detached

              return (
                <g key={ref}>
                  {/* The string. Pointers are always catalogue blue. */}
                  <line
                    x1={boxLeft(node.lane) + BOX_WIDTH}
                    y1={centerY(node.row)}
                    x2={cardX}
                    y2={y + CARD_HEIGHT / 2}
                    className={`stroke-catalogue${graft ? ' string-draw' : ''}`}
                    strokeWidth={1.5}
                    pathLength={1}
                    style={graft ? { animationDelay: `${(graft.pairs.length + 1) * 260}ms` } : undefined}
                  />
                  <rect
                    x={cardX}
                    y={y}
                    width={CARD_WIDTH}
                    height={CARD_HEIGHT}
                    rx={2}
                    className={`${filled ? 'fill-catalogue' : 'fill-board'} stroke-catalogue`}
                    strokeWidth={1}
                    strokeDasharray={!detached && refKind(ref) === 'tag' ? '3 2' : undefined}
                  />
                  <text
                    x={cardX + 8}
                    y={y + 18}
                    className={`font-display text-[11px] uppercase tracking-[0.14em] ${
                      filled ? 'fill-board' : 'fill-catalogue'
                    }`}
                  >
                    {detached
                      ? 'HEAD (detached)'
                      : attached
                        ? `HEAD → ${shortRef(ref)}`
                        : shortRef(ref)}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}
