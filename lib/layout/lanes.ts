/**
 * Lane assignment for the commit graph, the way `git log --graph` does it.
 *
 * Pure and deterministic: same DAG in, same lanes out, snapshot-tested.
 * CLAUDE.md invariant 12. Nothing here knows about SVG, pixels, or React —
 * the geometry lives in the component, the topology lives here.
 *
 * Unreachable commits are laid out too, in their own lanes to the right. They
 * are still on the shelf and the whole point is that you can see them, so they
 * get a position rather than being filtered out.
 */
import type { Oid } from '@/lib/hash'
import type { Commit } from '@/lib/git/objects'

export interface LayoutNode {
  readonly oid: Oid
  /** Vertical position, 0 at the top (newest). */
  readonly row: number
  /** Horizontal track. */
  readonly lane: number
  readonly reachable: boolean
}

export interface LayoutEdge {
  readonly from: Oid
  readonly to: Oid
  readonly fromRow: number
  readonly fromLane: number
  readonly toRow: number
  readonly toLane: number
  /** A second or later parent — the diagonal that makes a merge readable. */
  readonly merge: boolean
}

export interface Layout {
  readonly nodes: readonly LayoutNode[]
  readonly edges: readonly LayoutEdge[]
  readonly rows: number
  readonly lanes: number
}

/**
 * Commits newest first. Ties are broken by oid so the order is total — the
 * virtual clock can stamp two commits identically, and an unstable sort there
 * would make the layout non-deterministic.
 */
function order(commits: readonly Commit[]): Commit[] {
  return [...commits].sort(
    (a, b) => b.committer.timestamp - a.committer.timestamp || (a.oid < b.oid ? -1 : 1),
  )
}

export function layoutGraph(
  commits: readonly Commit[],
  reachable: ReadonlySet<Oid>,
): Layout {
  const rows = order(commits)
  const present = new Set(rows.map((commit) => commit.oid))

  const nodes: LayoutNode[] = []
  const edges: LayoutEdge[] = []
  const position = new Map<Oid, { row: number; lane: number }>()

  /** Lane index → the oid that lane is currently reserved for, or null. */
  const tracks: (Oid | null)[] = []

  const claim = (oid: Oid): number => {
    const existing = tracks.indexOf(oid)
    if (existing !== -1) return existing
    const free = tracks.indexOf(null)
    if (free !== -1) {
      tracks[free] = oid
      return free
    }
    tracks.push(oid)
    return tracks.length - 1
  }

  rows.forEach((commit, row) => {
    const lane = claim(commit.oid)
    tracks[lane] = null

    nodes.push({ oid: commit.oid, row, lane, reachable: reachable.has(commit.oid) })
    position.set(commit.oid, { row, lane })

    // The first parent inherits this lane, so a straight chain stays straight.
    // If another lane already reserved it, the leftmost claim wins — that keeps
    // the trunk running down lane 0 instead of being pulled sideways by
    // whichever branch happened to reach the shared ancestor first.
    const [first, ...rest] = commit.parents
    if (first !== undefined && present.has(first)) {
      const reserved = tracks.indexOf(first)
      if (reserved === -1) {
        tracks[lane] = first
      } else if (reserved > lane) {
        tracks[reserved] = null
        tracks[lane] = first
      }
    }
    for (const parent of rest) {
      if (present.has(parent)) claim(parent)
    }

    // Trim trailing empty lanes so a finished branch does not leave a gutter.
    while (tracks.length > 0 && tracks[tracks.length - 1] === null) tracks.pop()
  })

  for (const commit of rows) {
    const from = position.get(commit.oid)
    if (!from) continue
    commit.parents.forEach((parent, index) => {
      const to = position.get(parent)
      if (!to) return
      edges.push({
        from: commit.oid,
        to: parent,
        fromRow: from.row,
        fromLane: from.lane,
        toRow: to.row,
        toLane: to.lane,
        merge: index > 0,
      })
    })
  }

  return {
    nodes,
    edges,
    rows: nodes.length,
    lanes: nodes.reduce((widest, node) => Math.max(widest, node.lane + 1), 1),
  }
}
