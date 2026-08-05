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
import type { Head, RefMap } from './refs'
import type { Reflog } from './reflog'
import type { FileMap } from './tree'

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
