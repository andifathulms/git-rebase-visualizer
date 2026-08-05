/**
 * Line diff between two trees, and its unified rendering.
 *
 * git-diff(1) compares "changes between the working tree and the index, changes
 * between the index and a tree, changes between two trees…". The two-tree and
 * tree-vs-working-tree forms are what a sandbox needs.
 *
 * Pure and deterministic, like everything else in lib/git. The LCS routine is
 * the same one merge3 uses, for the same reason: a diff and a three-way merge
 * that disagreed about what changed would produce conflicts nobody could
 * explain.
 */
import { filePaths, type FileMap } from './tree'

export type LineKind = 'context' | 'added' | 'removed'

export interface DiffLine {
  readonly kind: LineKind
  readonly text: string
}

export interface FileDiff {
  readonly path: string
  readonly status: 'added' | 'removed' | 'modified'
  readonly lines: readonly DiffLine[]
  readonly added: number
  readonly removed: number
}

/** Index in `a` → matching index in `b`, or -1. Longest common subsequence. */
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

export function diffLines(
  before: readonly string[],
  after: readonly string[],
): DiffLine[] {
  const match = lcsMatches(before, after)
  const out: DiffLine[] = []
  let cursor = 0

  for (let i = 0; i < before.length; i++) {
    if (match[i] === -1) {
      out.push({ kind: 'removed', text: before[i] })
      continue
    }
    // Everything `after` gained before this common line is an addition.
    while (cursor < match[i]) {
      out.push({ kind: 'added', text: after[cursor] })
      cursor++
    }
    out.push({ kind: 'context', text: before[i] })
    cursor++
  }
  while (cursor < after.length) {
    out.push({ kind: 'added', text: after[cursor] })
    cursor++
  }

  return out
}

function sameLines(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((line, i) => line === b[i])
}

/** Every path that differs, in sorted order. */
export function diffTrees(before: FileMap, after: FileMap): FileDiff[] {
  const paths = [...new Set([...filePaths(before), ...filePaths(after)])].sort()
  const out: FileDiff[] = []

  for (const path of paths) {
    const a = before[path]
    const b = after[path]
    if (a !== undefined && b !== undefined && sameLines(a, b)) continue

    const lines = diffLines(a ?? [], b ?? [])
    out.push({
      path,
      status: a === undefined ? 'added' : b === undefined ? 'removed' : 'modified',
      lines,
      added: lines.filter((line) => line.kind === 'added').length,
      removed: lines.filter((line) => line.kind === 'removed').length,
    })
  }

  return out
}

const MARK: Record<LineKind, string> = { context: ' ', added: '+', removed: '-' }

/** Renders as git does, so the output is recognisable at a glance. */
export function formatDiff(files: readonly FileDiff[]): string {
  if (files.length === 0) return ''

  return files
    .map((file) => {
      const header = [
        `diff --git a/${file.path} b/${file.path}`,
        file.status === 'added' ? '--- /dev/null' : `--- a/${file.path}`,
        file.status === 'removed' ? '+++ /dev/null' : `+++ b/${file.path}`,
      ]
      return [...header, ...file.lines.map((line) => `${MARK[line.kind]}${line.text}`)].join('\n')
    })
    .join('\n')
}

export function diffStat(files: readonly FileDiff[]): { added: number; removed: number } {
  return files.reduce(
    (total, file) => ({ added: total.added + file.added, removed: total.removed + file.removed }),
    { added: 0, removed: 0 },
  )
}
