/**
 * The reflog: every ref movement, and the operation that caused it.
 *
 * CLAUDE.md invariant 9 — no exceptions. It is the only thing keeping an
 * orphaned commit addressable, which is exactly its role in real git, so a
 * missing entry silently destroys recoverable work.
 */
import type { Oid } from '@/lib/hash'
import { GitError } from './errors'
import type { RefName } from './refs'

/** `HEAD` gets its own log, as in real git — `.git/logs/HEAD`. */
export const HEAD_LOG = 'HEAD'

export interface ReflogEntry {
  /** A ref name, or `HEAD`. */
  readonly ref: RefName | typeof HEAD_LOG
  /** null when the ref did not exist before — branch creation. */
  readonly before: Oid | null
  /** null when the ref was deleted. */
  readonly after: Oid | null
  /** The command that moved it: `commit`, `rebase (finish)`, `reset`. */
  readonly operation: string
  /** Human-readable detail, shown in the register panel. */
  readonly message: string
  readonly timestamp: number
}

/** Chronological and append-only, in appearance as well as in fact. PRD §9. */
export type Reflog = readonly ReflogEntry[]

export function appendReflog(reflog: Reflog, entry: ReflogEntry): Reflog {
  return [...reflog, entry]
}

/** Entries for one ref, most recent first — the order `ref@{n}` indexes. */
export function entriesFor(reflog: Reflog, ref: RefName | typeof HEAD_LOG): ReflogEntry[] {
  return reflog.filter((entry) => entry.ref === ref).reverse()
}

/**
 * `ref@{n}` — gitrevisions: "the n-th prior value of that ref", where `@{0}` is
 * the current value. Each entry records the value the ref took, so `@{n}` is
 * the `after` of the n-th most recent entry.
 */
export function resolveReflog(
  reflog: Reflog,
  ref: RefName | typeof HEAD_LOG,
  n: number,
): Oid {
  const entries = entriesFor(reflog, ref)
  const entry = entries[n]
  if (!entry) {
    throw new GitError('unknown-revision', {
      en: `${ref}@{${n}} does not exist — the reflog for ${ref} has only ${entries.length} entries`,
      id: `${ref}@{${n}} tidak ada — reflog untuk ${ref} hanya punya ${entries.length} entri`,
    })
  }
  if (entry.after === null) {
    throw new GitError('unknown-revision', {
      en: `${ref}@{${n}} points at a ref deletion`,
      id: `${ref}@{${n}} menunjuk ke penghapusan ref`,
    })
  }
  return entry.after
}

/**
 * Everything the reflog still names. This is what makes an unreachable commit
 * recoverable, and what `gc` must keep until the reflog itself is expired.
 */
export function reflogOids(reflog: Reflog): Oid[] {
  const found = new Set<Oid>()
  for (const entry of reflog) {
    if (entry.before) found.add(entry.before)
    if (entry.after) found.add(entry.after)
  }
  return [...found].sort()
}
