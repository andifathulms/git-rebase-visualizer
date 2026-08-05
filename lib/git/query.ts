/**
 * Read-only views over a repository. Nothing here changes state, and nothing in
 * a component computes any of it — CLAUDE.md invariant 13.
 */
import type { Oid } from '@/lib/hash'
import type { Commit } from './objects'
import { listRefs, refsAt, resolveHead, shortRef, type RefName } from './refs'
import { requireCommit } from './store'
import type { Repository } from './state'
import { filePaths, readTree } from './tree'

/**
 * git-log(1) walks the ancestry of the given commits, newest first. Ties are
 * broken by oid so the ordering is total and deterministic even when the
 * virtual clock stamps two commits identically.
 */
export function history(repo: Repository, roots: readonly Oid[], limit?: number): Commit[] {
  const seen = new Set<Oid>()
  const queue: Oid[] = [...new Set(roots)].sort()
  const found: Commit[] = []

  while (queue.length > 0) {
    const oid = queue.shift()
    if (oid === undefined || seen.has(oid)) continue
    seen.add(oid)
    const commit = requireCommit(repo.store, oid)
    found.push(commit)
    for (const parent of commit.parents) queue.push(parent)
  }

  found.sort((a, b) => b.committer.timestamp - a.committer.timestamp || (a.oid < b.oid ? -1 : 1))
  return limit === undefined ? found : found.slice(0, limit)
}

/** Every commit in the store, whether or not anything points at it. */
export function allCommits(repo: Repository): Commit[] {
  return history(
    repo,
    Object.keys(repo.store.objects).filter((oid) => repo.store.objects[oid].type === 'commit'),
  )
}

export interface StatusReport {
  readonly head: string
  readonly detached: boolean
  readonly staged: readonly string[]
  readonly unstaged: readonly string[]
}

export function status(repo: Repository): StatusReport {
  const headOid = resolveHead(repo.refs, repo.head)
  const committed = headOid ? readTree(repo.store, requireCommit(repo.store, headOid).tree) : {}

  const differing = (a: Record<string, readonly string[]>, b: Record<string, readonly string[]>) =>
    [...new Set([...filePaths(a), ...filePaths(b)])].sort().filter((path) => {
      const left = a[path]
      const right = b[path]
      if (left === undefined || right === undefined) return left !== right
      return left.length !== right.length || left.some((line, i) => line !== right[i])
    })

  return {
    head:
      repo.head.type === 'attached'
        ? shortRef(repo.head.ref)
        : `HEAD detached di ${repo.head.oid.slice(0, 7)}`,
    detached: repo.head.type === 'detached',
    staged: differing(committed as Record<string, readonly string[]>, repo.index as Record<string, readonly string[]>),
    unstaged: differing(repo.index as Record<string, readonly string[]>, repo.worktree as Record<string, readonly string[]>),
  }
}

/** Which cards hang off a given box, for the graph. */
export function decorations(repo: Repository, oid: Oid): { refs: RefName[]; head: boolean } {
  return {
    refs: refsAt(repo.refs, oid),
    head: repo.head.type === 'detached' && repo.head.oid === oid,
  }
}

export function branchTips(repo: Repository): Array<{ ref: RefName; oid: Oid }> {
  return listRefs(repo.refs).map((ref) => ({ ref, oid: repo.refs[ref] }))
}
