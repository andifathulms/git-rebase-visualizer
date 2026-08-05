/**
 * Converting between a flat path→content map (what the user edits) and the
 * nested tree objects git actually stores.
 *
 * Writing a tree creates objects and never mutates any, so the round trip stays
 * inside the append-only rule: an unchanged subdirectory re-hashes to the same
 * oid and the existing object is reused. That reuse is exactly how a user
 * discovers git stores snapshots rather than diffs (PRD §5).
 */
import type { Oid } from '@/lib/hash'
import { GitError } from './errors'
import { makeBlob, makeTree, type TreeEntry } from './objects'
import { put, requireBlob, requireTree, type ObjectStore } from './store'

/** Path → file lines. Paths use `/` and are always handled in sorted order. */
export type FileMap = Readonly<Record<string, readonly string[]>>

export function filePaths(files: FileMap): string[] {
  return Object.keys(files).sort()
}

export function validatePath(path: string): void {
  if (path === '' || path.startsWith('/') || path.endsWith('/') || path.includes('//')) {
    throw new GitError('bad-path', {
      en: `invalid path: ${JSON.stringify(path)}`,
      id: `path tidak sah: ${JSON.stringify(path)}`,
    })
  }
  if (path.split('/').some((segment) => segment === '.' || segment === '..')) {
    throw new GitError('bad-path', {
      en: `invalid path: ${path}`,
      id: `path tidak sah: ${path}`,
    })
  }
}

interface Directory {
  readonly files: Map<string, readonly string[]>
  readonly dirs: Map<string, Directory>
}

function emptyDirectory(): Directory {
  return { files: new Map(), dirs: new Map() }
}

function insert(root: Directory, path: string, lines: readonly string[]): void {
  const segments = path.split('/')
  let node = root
  for (let i = 0; i < segments.length - 1; i++) {
    const name = segments[i]
    let child = node.dirs.get(name)
    if (!child) {
      child = emptyDirectory()
      node.dirs.set(name, child)
    }
    node = child
  }
  node.files.set(segments[segments.length - 1], lines)
}

function writeDirectory(
  store: ObjectStore,
  node: Directory,
): { store: ObjectStore; oid: Oid } {
  const entries: TreeEntry[] = []
  let next = store

  // Sorted so the walk is deterministic; makeTree re-sorts into git's own
  // ordering, which is what actually feeds the hash.
  for (const name of [...node.files.keys()].sort()) {
    const blob = makeBlob(node.files.get(name) ?? [])
    next = put(next, blob)
    entries.push({ name, oid: blob.oid, kind: 'blob' })
  }
  for (const name of [...node.dirs.keys()].sort()) {
    const child = node.dirs.get(name)
    if (!child) continue
    const written = writeDirectory(next, child)
    next = written.store
    entries.push({ name, oid: written.oid, kind: 'tree' })
  }

  const tree = makeTree(entries)
  next = put(next, tree)
  return { store: next, oid: tree.oid }
}

/** Creates the blob and tree objects for a file map and returns the root tree. */
export function writeTree(
  store: ObjectStore,
  files: FileMap,
): { store: ObjectStore; oid: Oid } {
  const root = emptyDirectory()
  for (const path of filePaths(files)) {
    validatePath(path)
    insert(root, path, files[path])
  }
  return writeDirectory(store, root)
}

export function readTree(store: ObjectStore, oid: Oid, prefix = ''): FileMap {
  const tree = requireTree(store, oid)
  const files: Record<string, readonly string[]> = {}
  for (const entry of tree.entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.kind === 'blob') {
      files[path] = requireBlob(store, entry.oid).lines
    } else {
      Object.assign(files, readTree(store, entry.oid, path))
    }
  }
  return files
}

export function sameFiles(a: FileMap, b: FileMap): boolean {
  const paths = filePaths(a)
  if (paths.length !== filePaths(b).length) return false
  return paths.every((path) => {
    const left = a[path]
    const right = b[path]
    return (
      right !== undefined &&
      left.length === right.length &&
      left.every((line, i) => line === right[i])
    )
  })
}
