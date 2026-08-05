/**
 * Three-way merge lifted from a single file to a whole tree.
 *
 * Per path, this is the same decision table git uses: added on one side, deleted
 * on one side, or changed on both. A modify/delete pair is a conflict rather
 * than a silent choice — git-merge(1) lists it among the conflicts it hands
 * back to the user, and silently keeping or dropping the file is precisely the
 * plausible-wrong-result this project refuses to produce.
 */
import { merge3 } from './merge3'
import { filePaths, type FileMap } from './tree'

export interface TreeMergeResult {
  readonly files: FileMap
  readonly conflicts: readonly string[]
}

function equal(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  if (a === undefined || b === undefined) return a === b
  return a.length === b.length && a.every((line, i) => line === b[i])
}

export function mergeTrees(
  base: FileMap,
  ours: FileMap,
  theirs: FileMap,
  labels: { ours: string; theirs: string },
): TreeMergeResult {
  const paths = [...new Set([...filePaths(base), ...filePaths(ours), ...filePaths(theirs)])].sort()

  const files: Record<string, readonly string[]> = {}
  const conflicts: string[] = []

  for (const path of paths) {
    const b = base[path]
    const o = ours[path]
    const t = theirs[path]

    if (equal(o, t)) {
      // Both sides agree, including both having deleted it.
      if (o !== undefined) files[path] = o
      continue
    }

    if (equal(b, o)) {
      // Only theirs touched it — including deleting it.
      if (t !== undefined) files[path] = t
      continue
    }

    if (equal(b, t)) {
      if (o !== undefined) files[path] = o
      continue
    }

    if (o === undefined || t === undefined) {
      // One side deleted, the other changed. git keeps the changed content in
      // the working tree and reports the path as conflicted.
      conflicts.push(path)
      const survivor = o ?? t
      if (survivor) files[path] = survivor
      continue
    }

    const merged = merge3(b ?? [], o, t, labels)
    files[path] = merged.lines
    if (merged.conflicted) conflicts.push(path)
  }

  return { files, conflicts: conflicts.sort() }
}
