/**
 * The single path by which a ref moves.
 *
 * Commands do not write `repo.refs` directly. Routing every movement through
 * here is how CLAUDE.md invariant 9 — every ref movement writes a reflog entry —
 * is enforced structurally rather than remembered case by case.
 */
import type { Oid } from '@/lib/hash'
import { appendReflog, HEAD_LOG } from './reflog'
import { headBranch, readRef, removeRef, writeRef, type Head, type RefName } from './refs'
import type { GitEvent, Repository } from './state'

interface Movement {
  readonly repo: Repository
  readonly events: readonly GitEvent[]
}

export function updateRef(
  repo: Repository,
  ref: RefName,
  to: Oid | null,
  operation: string,
  message: string,
): Movement {
  const before = readRef(repo.refs, ref) ?? null
  const refs = to === null ? removeRef(repo.refs, ref) : writeRef(repo.refs, ref, to)

  let reflog = appendReflog(repo.reflog, {
    ref,
    before,
    after: to,
    operation,
    message,
    timestamp: repo.clock,
  })

  // Real git keeps a separate log for HEAD, and it is the one people reach for
  // after a bad reset, so it has to be written whenever the checked-out branch
  // moves — not only on checkout.
  if (headBranch(repo.head) === ref) {
    reflog = appendReflog(reflog, {
      ref: HEAD_LOG,
      before,
      after: to,
      operation,
      message,
      timestamp: repo.clock,
    })
  }

  return {
    repo: { ...repo, refs, reflog },
    events: [{ type: 'ref-moved', ref, from: before, to, operation }],
  }
}

/** Moving `HEAD` itself — checkout, switch, and detaching. */
export function setHead(
  repo: Repository,
  head: Head,
  operation: string,
  message: string,
): Movement {
  const before = resolve(repo, repo.head)
  const after = resolve(repo, head)

  const reflog = appendReflog(repo.reflog, {
    ref: HEAD_LOG,
    before,
    after,
    operation,
    message,
    timestamp: repo.clock,
  })

  return {
    repo: { ...repo, head, reflog },
    events: [{ type: 'head-moved', to: head }],
  }
}

function resolve(repo: Repository, head: Head): Oid | null {
  return head.type === 'detached' ? head.oid : readRef(repo.refs, head.ref) ?? null
}
