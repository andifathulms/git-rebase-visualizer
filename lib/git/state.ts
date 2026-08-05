/**
 * The whole repository state, and the virtual clock that keeps it deterministic.
 *
 * `lib/git` is pure: `(state, command) → { state, events }`. No Date, no
 * Math.random, no DOM, no module-level mutable state. CLAUDE.md invariant 5.
 * Timestamps come from `clock` here, advanced explicitly by whoever needs one,
 * so the same command sequence produces a byte-identical repository anywhere.
 */
import type { Oid } from '@/lib/hash'
import type { Signature } from './objects'
import { emptyStore, type ObjectStore } from './store'
import type { Head, RefMap, RefName } from './refs'
import type { Reflog } from './reflog'
import type { FileMap } from './tree'

/** One line of a `rebase -i` todo list. git-rebase(1), "Interactive Mode". */
export interface RebaseStep {
  readonly action: 'pick' | 'reword' | 'squash' | 'fixup' | 'drop'
  readonly oid: Oid
  /** Replacement message for `reword`, or the combined one for `squash`. */
  readonly message?: string
}

/**
 * An operation stopped part-way — what real git records in MERGE_HEAD or
 * .git/rebase-merge. It is state, not a modal: the user resolves files, stages
 * them, and continues or aborts, exactly as at the command line.
 */
export type PendingOperation =
  | {
      readonly type: 'merge'
      readonly theirs: Oid
      readonly theirsLabel: string
      readonly message: string
      readonly conflicts: readonly string[]
    }
  | {
      readonly type: 'rebase'
      readonly onto: Oid
      /** The branch being replayed, or null when rebasing a detached HEAD. */
      readonly branch: RefName | null
      readonly originalHead: Oid
      readonly todo: readonly RebaseStep[]
      /** Old oid → new oid, as each commit is copied. Drives the animation. */
      readonly replaced: readonly { readonly from: Oid; readonly to: Oid }[]
      readonly conflicts: readonly string[]
    }
  | {
      readonly type: 'cherry-pick'
      readonly remaining: readonly Oid[]
      readonly current: Oid
      readonly conflicts: readonly string[]
    }

export interface Identity {
  readonly name: string
  readonly email: string
  readonly timezone: string
}

export const DEFAULT_IDENTITY: Identity = {
  name: 'Anda',
  email: 'anda@cangkok.local',
  timezone: '+0700',
}

/** A fixed, arbitrary starting point: 2023-11-14T22:13:20Z. */
export const EPOCH = 1_700_000_000

/** One minute per operation — enough to order commits, small enough to read. */
export const CLOCK_STEP = 60

export interface Repository {
  readonly store: ObjectStore
  readonly refs: RefMap
  readonly head: Head
  readonly reflog: Reflog
  /** Virtual seconds since the epoch. Never read from the host clock. */
  readonly clock: number
  readonly identity: Identity
  /**
   * The staging area. `commit` builds its tree from here, and `reset --mixed`
   * resets it — git-reset(1): "--mixed resets the index but not the working
   * tree".
   */
  readonly index: FileMap
  /**
   * The working tree. Only `reset --hard` touches it — git-reset(1): "--hard
   * resets the index and working tree".
   */
  readonly worktree: FileMap
  /** A merge, rebase, or cherry-pick stopped at a conflict. */
  readonly pending: PendingOperation | null
}

export const INITIAL_BRANCH = 'refs/heads/main'

export function emptyRepository(identity: Identity = DEFAULT_IDENTITY): Repository {
  return {
    store: emptyStore,
    refs: {},
    // Attached to a branch that does not exist yet — git calls this unborn.
    head: { type: 'attached', ref: INITIAL_BRANCH },
    reflog: [],
    clock: EPOCH,
    identity,
    index: {},
    worktree: {},
    pending: null,
  }
}

/** Advances the clock and returns the signature stamped at the new time. */
export function tick(repo: Repository): { repo: Repository; signature: Signature } {
  const clock = repo.clock + CLOCK_STEP
  return {
    repo: { ...repo, clock },
    signature: {
      name: repo.identity.name,
      email: repo.identity.email,
      timestamp: clock,
      timezone: repo.identity.timezone,
    },
  }
}

/**
 * What a command reports back to the UI. Discriminated on `type` so adding a
 * kind surfaces every site that must handle it.
 */
export type GitEvent =
  | { readonly type: 'object-created'; readonly oid: Oid; readonly kind: string }
  | {
      readonly type: 'ref-moved'
      readonly ref: string
      readonly from: Oid | null
      readonly to: Oid | null
      readonly operation: string
    }
  | { readonly type: 'head-moved'; readonly to: Head }
  | { readonly type: 'commits-orphaned'; readonly oids: readonly Oid[] }
  | { readonly type: 'conflict'; readonly paths: readonly string[] }
  | { readonly type: 'message'; readonly tone: 'info' | 'warn' | 'destructive'; readonly text: string }

export interface CommandResult {
  readonly repo: Repository
  readonly events: readonly GitEvent[]
}
