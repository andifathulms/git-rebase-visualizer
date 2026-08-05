/**
 * Three-way merge over line arrays — the diff3 algorithm.
 *
 * File content is real in this simulator, so a merge or rebase that cannot
 * apply cleanly produces a genuine conflict rather than a simulated one. PRD
 * §6.6. Only plain three-way is implemented; `ours`, `theirs`, `octopus`, and
 * `subtree` are out of scope by PRD §4 and are refused by name elsewhere.
 *
 * Pure and deterministic: same three inputs, same output, always.
 */

/** Longest common subsequence, as a map from index in `a` to index in `b`. */
function lcsMatches(a: readonly string[], b: readonly string[]): number[] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  )
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  const match = new Array<number>(a.length).fill(-1)
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      match[i] = j
      i++
      j++
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i++
    } else {
      j++
    }
  }
  return match
}

export interface MergeRegion {
  readonly kind: 'stable' | 'resolved' | 'conflict'
  readonly lines: readonly string[]
  /** Present only on a conflict, for the three-way view. */
  readonly base?: readonly string[]
  readonly ours?: readonly string[]
  readonly theirs?: readonly string[]
}

export interface MergeResult {
  readonly regions: readonly MergeRegion[]
  readonly conflicted: boolean
  /** Merged content, with conflict markers where the sides disagreed. */
  readonly lines: readonly string[]
}

function equalLines(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((line, i) => line === b[i])
}

export const CONFLICT_START = '<<<<<<<'
export const CONFLICT_BASE = '|||||||'
export const CONFLICT_MID = '======='
export const CONFLICT_END = '>>>>>>>'

export function merge3(
  base: readonly string[],
  ours: readonly string[],
  theirs: readonly string[],
  labels: { ours: string; theirs: string } = { ours: 'HEAD', theirs: 'incoming' },
): MergeResult {
  const matchOurs = lcsMatches(base, ours)
  const matchTheirs = lcsMatches(base, theirs)

  const regions: MergeRegion[] = []
  let b = 0
  let o = 0
  let t = 0

  const pushStable = (lines: readonly string[]) => {
    if (lines.length === 0) return
    const last = regions[regions.length - 1]
    if (last && last.kind === 'stable') {
      regions[regions.length - 1] = { kind: 'stable', lines: [...last.lines, ...lines] }
    } else {
      regions.push({ kind: 'stable', lines })
    }
  }

  while (b < base.length || o < ours.length || t < theirs.length) {
    // A line both sides left in place, still aligned on all three cursors.
    if (b < base.length && matchOurs[b] === o && matchTheirs[b] === t) {
      pushStable([base[b]])
      b++
      o++
      t++
      continue
    }

    // Otherwise run forward to the next line both sides agree on.
    let nextBase = b
    while (
      nextBase < base.length &&
      (matchOurs[nextBase] === -1 || matchTheirs[nextBase] === -1)
    ) {
      nextBase++
    }
    const nextOurs = nextBase < base.length ? matchOurs[nextBase] : ours.length
    const nextTheirs = nextBase < base.length ? matchTheirs[nextBase] : theirs.length

    const baseSlice = base.slice(b, nextBase)
    const oursSlice = ours.slice(o, Math.max(o, nextOurs))
    const theirsSlice = theirs.slice(t, Math.max(t, nextTheirs))

    if (equalLines(oursSlice, theirsSlice)) {
      // Both sides made the same edit — not a conflict, and git agrees.
      pushStable(oursSlice)
    } else if (equalLines(baseSlice, oursSlice)) {
      regions.push({ kind: 'resolved', lines: theirsSlice })
    } else if (equalLines(baseSlice, theirsSlice)) {
      regions.push({ kind: 'resolved', lines: oursSlice })
    } else {
      regions.push({
        kind: 'conflict',
        lines: oursSlice,
        base: baseSlice,
        ours: oursSlice,
        theirs: theirsSlice,
      })
    }

    b = nextBase
    o = Math.max(o, nextOurs)
    t = Math.max(t, nextTheirs)
  }

  const conflicted = regions.some((region) => region.kind === 'conflict')
  const lines: string[] = []
  for (const region of regions) {
    if (region.kind === 'conflict') {
      // The same markers git writes, so what the user learns here transfers.
      lines.push(`${CONFLICT_START} ${labels.ours}`)
      lines.push(...(region.ours ?? []))
      lines.push(CONFLICT_MID)
      lines.push(...(region.theirs ?? []))
      lines.push(`${CONFLICT_END} ${labels.theirs}`)
    } else {
      lines.push(...region.lines)
    }
  }

  return { regions, conflicted, lines }
}

/** True if the file still carries unresolved markers — checked before commit. */
export function hasConflictMarkers(lines: readonly string[]): boolean {
  return lines.some(
    (line) =>
      line.startsWith(CONFLICT_START) ||
      line.startsWith(CONFLICT_MID) ||
      line.startsWith(CONFLICT_END) ||
      line.startsWith(CONFLICT_BASE),
  )
}
