/**
 * git-merge-base(1): "find as good common ancestors as possible ... one common
 * ancestor is better than another common ancestor if the latter is an ancestor
 * of the former."
 *
 * Computed by traversal every time, like reachability — the histories here are
 * small and a stale answer would silently produce a wrong merge.
 */
import type { Oid } from '@/lib/hash'
import { GitError } from './errors'
import { requireCommit, type ObjectStore } from './store'

/** Every ancestor of `oid`, including `oid` itself. */
export function ancestors(store: ObjectStore, oid: Oid): Set<Oid> {
  const seen = new Set<Oid>()
  const pending = [oid]
  while (pending.length > 0) {
    const current = pending.pop()
    if (current === undefined || seen.has(current)) continue
    seen.add(current)
    for (const parent of requireCommit(store, current).parents) pending.push(parent)
  }
  return seen
}

export function isAncestor(store: ObjectStore, maybeAncestor: Oid, of: Oid): boolean {
  return ancestors(store, of).has(maybeAncestor)
}

/**
 * The best common ancestors. More than one means a criss-cross merge, which
 * real git resolves by recursively merging the candidates; Cangkok refuses
 * loudly instead of picking one and producing a plausible wrong result.
 * PRD §4 keeps merge strategies to plain three-way.
 */
export function mergeBases(store: ObjectStore, a: Oid, b: Oid): Oid[] {
  const fromA = ancestors(store, a)
  const common = [...ancestors(store, b)].filter((oid) => fromA.has(oid)).sort()

  return common.filter(
    (candidate) =>
      !common.some(
        (other) => other !== candidate && ancestors(store, other).has(candidate),
      ),
  )
}

export function mergeBase(store: ObjectStore, a: Oid, b: Oid): Oid | undefined {
  const bases = mergeBases(store, a, b)
  if (bases.length > 1) {
    throw new GitError(
      'criss-cross',
      `ada ${bases.length} merge base antara ${a.slice(0, 7)} dan ${b.slice(0, 7)} (riwayat criss-cross). Cangkok hanya melakukan three-way merge biasa dan tidak menebak yang mana — lihat PRD §4.`,
    )
  }
  return bases[0]
}
