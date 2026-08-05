/**
 * Refs are mutable pointers, stored separately from objects.
 * CLAUDE.md invariant 8 — moving a ref touches no object.
 */
import type { Oid } from '@/lib/hash'
import { GitError } from './errors'

/** Fully-qualified, as git stores it: `refs/heads/main`, `refs/tags/v1`. */
export type RefName = string

export type RefKind = 'branch' | 'tag' | 'remote'

export const HEADS = 'refs/heads/'
export const TAGS = 'refs/tags/'
export const REMOTES = 'refs/remotes/'

export type RefMap = Readonly<Record<RefName, Oid>>

/**
 * `HEAD` is a pointer to a pointer. That indirection is what `checkout` changes
 * and what confuses people, so it is modelled explicitly rather than collapsed
 * into an oid. PRD §6.1.
 */
export type Head =
  | { readonly type: 'attached'; readonly ref: RefName }
  | { readonly type: 'detached'; readonly oid: Oid }

export function branchRef(name: string): RefName {
  return name.startsWith(HEADS) ? name : `${HEADS}${name}`
}

export function tagRef(name: string): RefName {
  return name.startsWith(TAGS) ? name : `${TAGS}${name}`
}

export function remoteRef(remote: string, branch: string): RefName {
  return `${REMOTES}${remote}/${branch}`
}

export function refKind(ref: RefName): RefKind {
  if (ref.startsWith(HEADS)) return 'branch'
  if (ref.startsWith(TAGS)) return 'tag'
  if (ref.startsWith(REMOTES)) return 'remote'
  throw new GitError('invariant', {
    en: `ref with no known namespace: ${ref}`,
    id: `ref tanpa namespace yang dikenal: ${ref}`,
  })
}

/** `refs/heads/main` → `main`; `refs/remotes/origin/main` → `origin/main`. */
export function shortRef(ref: RefName): string {
  for (const prefix of [HEADS, TAGS, REMOTES]) {
    if (ref.startsWith(prefix)) return ref.slice(prefix.length)
  }
  return ref
}

/** Sorted — ref order reaches the UI and the URL encoding. Invariant 6. */
export function listRefs(refs: RefMap, kind?: RefKind): RefName[] {
  return Object.keys(refs)
    .filter((ref) => kind === undefined || refKind(ref) === kind)
    .sort()
}

export function readRef(refs: RefMap, ref: RefName): Oid | undefined {
  return Object.prototype.hasOwnProperty.call(refs, ref) ? refs[ref] : undefined
}

export function requireRef(refs: RefMap, ref: RefName): Oid {
  const oid = readRef(refs, ref)
  if (oid === undefined) {
    throw new GitError('unknown-ref', {
      en: `ref not found: ${ref}`,
      id: `ref tidak ditemukan: ${ref}`,
    })
  }
  return oid
}

export function writeRef(refs: RefMap, ref: RefName, oid: Oid): RefMap {
  return { ...refs, [ref]: oid }
}

export function removeRef(refs: RefMap, ref: RefName): RefMap {
  const next: Record<RefName, Oid> = {}
  for (const name of listRefs(refs)) {
    if (name !== ref) next[name] = refs[name]
  }
  return next
}

/**
 * The oid `HEAD` currently names, or undefined when it is attached to a branch
 * that does not exist yet — the state of a fresh repository before its first
 * commit, which git calls an unborn branch.
 */
export function resolveHead(refs: RefMap, head: Head): Oid | undefined {
  return head.type === 'detached' ? head.oid : readRef(refs, head.ref)
}

export function headBranch(head: Head): RefName | undefined {
  return head.type === 'attached' ? head.ref : undefined
}

/** Every ref that currently points at `oid`, sorted. */
export function refsAt(refs: RefMap, oid: Oid): RefName[] {
  return listRefs(refs).filter((ref) => refs[ref] === oid)
}
