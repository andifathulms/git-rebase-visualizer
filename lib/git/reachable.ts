/**
 * Reachability by traversal from refs, computed fresh every time.
 *
 * CLAUDE.md invariant 7. Incremental refcounting would drift, and the orphan
 * view — the thing no other visualiser offers — is only trustworthy if the
 * traversal is authoritative. This is called on every render; the graphs here
 * are small and correctness is worth more than the cycles.
 */
import type { Oid } from '@/lib/hash'
import { listRefs, resolveHead } from './refs'
import { reflogOids } from './reflog'
import { get, oids, requireObject, type ObjectStore } from './store'
import type { Repository } from './state'

/** Every object reachable from the given roots, following the object graph. */
export function reachableFrom(store: ObjectStore, roots: readonly Oid[]): Set<Oid> {
  const seen = new Set<Oid>()
  // Sorted so the traversal order is deterministic even though the result is a
  // set — a stack seeded from an unordered collection would not be. Invariant 6.
  const pending = [...roots].sort()

  while (pending.length > 0) {
    const oid = pending.pop()
    if (oid === undefined || seen.has(oid)) continue
    const object = get(store, oid)
    if (!object) continue
    seen.add(oid)

    switch (object.type) {
      case 'blob':
        break
      case 'tree':
        for (const entry of object.entries) pending.push(entry.oid)
        break
      case 'commit':
        pending.push(object.tree)
        for (const parent of object.parents) pending.push(parent)
        break
      case 'tag':
        pending.push(object.target)
        break
    }
  }

  return seen
}

/** The oids the refs and HEAD name right now — not the reflog. */
export function refRoots(repo: Repository): Oid[] {
  const roots = listRefs(repo.refs).map((ref) => repo.refs[ref])
  const head = resolveHead(repo.refs, repo.head)
  if (head) roots.push(head)
  return [...new Set(roots)].sort()
}

export function reachable(repo: Repository): Set<Oid> {
  return reachableFrom(repo.store, refRoots(repo))
}

/**
 * Objects still in the vault that no catalogue card points to. Present but
 * inactive — rendered `faded`, never as deleted. PRD §6.1, §9.
 */
export function unreachable(repo: Repository): Oid[] {
  const live = reachable(repo)
  return oids(repo.store).filter((oid) => !live.has(oid))
}

/** Unreachable commits specifically — what the orphan view lists. */
export function orphanedCommits(repo: Repository): Oid[] {
  return unreachable(repo).filter((oid) => requireObject(repo.store, oid).type === 'commit')
}

/**
 * What `gc` keeps: everything reachable from refs, plus everything the reflog
 * still names. Real git expires the reflog first; here the reflog is authority
 * until the user explicitly clears it, which keeps the recovery lesson honest.
 */
export function gcKeepSet(repo: Repository): Set<Oid> {
  return reachableFrom(repo.store, [...refRoots(repo), ...reflogOids(repo.reflog)])
}
