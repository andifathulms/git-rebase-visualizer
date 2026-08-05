/**
 * git-rebase(1): "Reapply commits on top of another base tip."
 *
 * Reapply, not move. Each commit in `upstream..HEAD` is replayed as a *new*
 * object, and because a commit's hash covers its parents, every replayed commit
 * gets a new id even when its tree is byte-identical. The originals stay in the
 * store, unreferenced, until gc — which is the single thing this project exists
 * to show. No special-casing produces that; it falls out of the object model.
 *
 * git-rebase(1) on identity: "the author name and date are preserved, but the
 * committer ... is the person doing the rebase." So the author is copied and
 * the committer is stamped from the virtual clock — which alone changes the
 * hash, exactly as it does in real git.
 *
 * Not implemented, and refused by name rather than approximated:
 *   - rebasing merge commits (`--rebase-merges`)
 *   - dropping commits already upstream by patch-id equivalence; Cangkok
 *     selects `upstream..HEAD` by reachability only.
 */
import type { Oid } from '@/lib/hash'
import { GitError } from '../errors'
import { ancestors } from '../merge-base'
import { hasConflictMarkers } from '../merge3'
import { mergeTrees } from '../merge-trees'
import { makeCommit } from '../objects'
import { orphanedCommits } from '../reachable'
import { headBranch, resolveHead, shortRef } from '../refs'
import { revParseCommit } from '../revparse'
import { put, requireCommit } from '../store'
import {
  tick,
  type CommandResult,
  type GitEvent,
  type PendingOperation,
  type RebaseStep,
  type Repository,
} from '../state'
import { readTree, writeTree, type FileMap } from '../tree'
import { setHead, updateRef } from '../update-ref'

function treeOf(repo: Repository, commitOid: Oid): FileMap {
  return readTree(repo.store, requireCommit(repo.store, commitOid).tree)
}

/** The commits in `upstream..HEAD`, oldest first. */
export function commitsToReplay(repo: Repository, upstream: Oid, head: Oid): Oid[] {
  const upstreamSide = ancestors(repo.store, upstream)
  const list: Oid[] = []
  let current = head

  while (!upstreamSide.has(current)) {
    const commit = requireCommit(repo.store, current)
    if (commit.parents.length > 1) {
      throw new GitError(
        'unsupported',
        `${current.slice(0, 7)} adalah merge commit. Rebase melewati merge (--rebase-merges) tidak didukung — lihat PRD §4.`,
      )
    }
    list.unshift(current)
    const parent = commit.parents[0]
    if (parent === undefined) break
    current = parent
  }

  return list
}

export function planRebase(
  repo: Repository,
  options: { upstream: string; onto?: string },
): { steps: RebaseStep[]; onto: Oid; upstream: Oid; head: Oid } {
  const head = resolveHead(repo.refs, repo.head)
  if (!head) throw new GitError('unborn', 'belum ada commit di branch ini')

  const upstream = revParseCommit(repo, options.upstream)
  const onto = options.onto ? revParseCommit(repo, options.onto) : upstream

  return {
    steps: commitsToReplay(repo, upstream, head).map((oid) => ({ action: 'pick', oid })),
    onto,
    upstream,
    head,
  }
}

/** Replays one commit onto the current HEAD, three-way against its parent. */
function applyOnto(
  repo: Repository,
  commitOid: Oid,
  ontoOid: Oid,
): { files: FileMap; conflicts: readonly string[] } {
  const commit = requireCommit(repo.store, commitOid)
  const parent = commit.parents[0]
  return mergeTrees(
    parent ? treeOf(repo, parent) : {},
    treeOf(repo, ontoOid),
    treeOf(repo, commitOid),
    { ours: `HEAD (${ontoOid.slice(0, 7)})`, theirs: `${commitOid.slice(0, 7)}` },
  )
}

/** Writes the replayed commit. The author is copied; the committer is new. */
function recordReplay(
  repo: Repository,
  input: {
    files: FileMap
    original: Oid
    parents: readonly Oid[]
    message?: string
    reuseAuthorFrom?: Oid
  },
): { repo: Repository; oid: Oid } {
  const source = requireCommit(repo.store, input.reuseAuthorFrom ?? input.original)
  const written = writeTree(repo.store, input.files)
  const ticked = tick({ ...repo, store: written.store })

  const object = makeCommit({
    tree: written.oid,
    parents: input.parents,
    author: source.author,
    committer: ticked.signature,
    message: input.message ?? source.message,
  })

  return {
    repo: { ...ticked.repo, store: put(ticked.repo.store, object), index: input.files, worktree: input.files },
    oid: object.oid,
  }
}

/**
 * Runs the todo list until it is empty or a step conflicts. Called by `rebase`,
 * `--continue`, and `--skip` alike, so all three share one implementation.
 */
function runTodo(repo: Repository, pending: Extract<PendingOperation, { type: 'rebase' }>): CommandResult {
  let working = repo
  let state = pending
  const events: GitEvent[] = []

  while (state.todo.length > 0) {
    const step = state.todo[0]
    const rest = state.todo.slice(1)

    if (step.action === 'drop') {
      state = { ...state, todo: rest }
      events.push({
        type: 'message',
        tone: 'info',
        text: `drop ${step.oid.slice(0, 7)} — dilewati, objek aslinya tetap di store.`,
      })
      continue
    }

    const headOid = resolveHead(working.refs, working.head)
    if (!headOid) throw new GitError('invariant', 'rebase kehilangan HEAD')

    const applied = applyOnto(working, step.oid, headOid)

    if (applied.conflicts.length > 0) {
      return {
        repo: {
          ...working,
          index: applied.files,
          worktree: applied.files,
          pending: { ...state, conflicts: applied.conflicts },
        },
        events: [
          ...events,
          { type: 'conflict', paths: applied.conflicts },
          {
            type: 'message',
            tone: 'warn',
            text: `Konflik saat memutar ulang ${step.oid.slice(0, 7)} pada ${applied.conflicts.join(', ')}. Selesaikan, \`add\`, lalu \`rebase --continue\`; atau \`rebase --skip\`, atau \`rebase --abort\` untuk mengembalikan branch ke posisi semula.`,
          },
        ],
      }
    }

    const squashing = step.action === 'squash' || step.action === 'fixup'
    const headCommit = requireCommit(working.store, headOid)

    if (squashing && state.replaced.length === 0) {
      throw new GitError(
        'bad-todo',
        `${step.action} tidak boleh jadi langkah pertama — tidak ada commit sebelumnya untuk digabung`,
      )
    }

    const parents = squashing ? headCommit.parents : [headOid]
    const message = squashing
      ? step.action === 'fixup'
        ? headCommit.message
        : step.message ?? `${headCommit.message.trim()}\n\n${requireCommit(working.store, step.oid).message.trim()}`
      : step.action === 'reword'
        ? step.message ?? requireCommit(working.store, step.oid).message
        : undefined

    const recorded = recordReplay(working, {
      files: applied.files,
      original: step.oid,
      parents,
      message,
      // A squash keeps the earlier commit's author, as git does.
      reuseAuthorFrom: squashing ? headCommit.oid : step.oid,
    })

    working = recorded.repo
    events.push({ type: 'object-created', oid: recorded.oid, kind: 'commit' })

    const moved =
      working.head.type === 'attached'
        ? updateRef(working, working.head.ref, recorded.oid, 'rebase', `${step.action} ${step.oid.slice(0, 7)}`)
        : setHead(working, { type: 'detached', oid: recorded.oid }, 'rebase', `${step.action} ${step.oid.slice(0, 7)}`)
    working = moved.repo

    state = {
      ...state,
      todo: rest,
      replaced: squashing ? state.replaced : [...state.replaced, { from: step.oid, to: recorded.oid }],
      conflicts: [],
    }
  }

  const finished: Repository = { ...working, pending: null }
  const orphans = orphanedCommits(finished)

  return {
    repo: finished,
    events: [
      ...events,
      ...(orphans.length > 0
        ? [{ type: 'commits-orphaned' as const, oids: orphans }]
        : []),
      {
        type: 'message',
        tone: 'info',
        text: state.replaced.length
          ? `Rebase selesai. ${state.replaced.length} commit ditulis ulang sebagai objek baru: ${state.replaced
              .map((pair) => `${pair.from.slice(0, 7)} → ${pair.to.slice(0, 7)}`)
              .join(', ')}. Yang lama masih di rak, tanpa kartu yang menunjuknya.`
          : 'Rebase selesai — tidak ada commit yang perlu diputar ulang.',
      },
    ],
  }
}

export function rebase(
  repo: Repository,
  options: { upstream: string; onto?: string; todo?: readonly RebaseStep[] },
): CommandResult {
  if (repo.pending) {
    throw new GitError(
      'pending',
      `masih ada ${repo.pending.type} yang belum selesai — gunakan --continue atau --abort`,
    )
  }

  const plan = planRebase(repo, options)
  const todo = options.todo ?? plan.steps

  if (todo.length === 0) {
    return {
      repo,
      events: [
        {
          type: 'message',
          tone: 'info',
          text: 'Sudah mutakhir — tidak ada commit di upstream..HEAD.',
        },
      ],
    }
  }

  // Detach onto the new base first: the branch card only moves as each commit
  // lands, which is what makes the string visibly swing in the graph.
  const branch = headBranch(repo.head)
  let working = repo
  if (branch) {
    const moved = updateRef(repo, branch, plan.onto, 'rebase', `mulai di ${plan.onto.slice(0, 7)}`)
    working = moved.repo
  } else {
    const moved = setHead(repo, { type: 'detached', oid: plan.onto }, 'rebase', 'mulai')
    working = moved.repo
  }

  const ontoFiles = treeOf(working, plan.onto)
  working = { ...working, index: ontoFiles, worktree: ontoFiles }

  return runTodo(working, {
    type: 'rebase',
    onto: plan.onto,
    branch: branch ?? null,
    originalHead: plan.head,
    todo,
    replaced: [],
    conflicts: [],
  })
}

export function rebaseContinue(repo: Repository): CommandResult {
  const pending = repo.pending
  if (!pending || pending.type !== 'rebase') {
    throw new GitError('no-rebase', 'tidak ada rebase yang sedang berjalan')
  }

  const step = pending.todo[0]
  if (!step) throw new GitError('invariant', 'rebase tanpa langkah yang tersisa')

  const unresolved = pending.conflicts.filter((path) => {
    const staged = repo.index[path]
    return staged !== undefined && hasConflictMarkers(staged)
  })
  if (unresolved.length > 0) {
    throw new GitError(
      'unresolved',
      `masih ada penanda konflik di ${unresolved.join(', ')} — perbaiki lalu \`add\` file-nya`,
    )
  }

  const headOid = resolveHead(repo.refs, repo.head)
  if (!headOid) throw new GitError('invariant', 'rebase kehilangan HEAD')

  const recorded = recordReplay(repo, {
    files: repo.index,
    original: step.oid,
    parents: [headOid],
    message: step.message,
  })

  const moved =
    recorded.repo.head.type === 'attached'
      ? updateRef(recorded.repo, recorded.repo.head.ref, recorded.oid, 'rebase', `lanjut ${step.oid.slice(0, 7)}`)
      : setHead(recorded.repo, { type: 'detached', oid: recorded.oid }, 'rebase', 'lanjut')

  return runTodo(moved.repo, {
    ...pending,
    todo: pending.todo.slice(1),
    replaced: [...pending.replaced, { from: step.oid, to: recorded.oid }],
    conflicts: [],
  })
}

export function rebaseSkip(repo: Repository): CommandResult {
  const pending = repo.pending
  if (!pending || pending.type !== 'rebase') {
    throw new GitError('no-rebase', 'tidak ada rebase yang sedang berjalan')
  }

  const headOid = resolveHead(repo.refs, repo.head)
  const files = headOid ? treeOf(repo, headOid) : {}

  return runTodo(
    { ...repo, index: files, worktree: files },
    { ...pending, todo: pending.todo.slice(1), conflicts: [] },
  )
}

export function rebaseAbort(repo: Repository): CommandResult {
  const pending = repo.pending
  if (!pending || pending.type !== 'rebase') {
    throw new GitError('no-rebase', 'tidak ada rebase yang sedang berjalan')
  }

  const restored = pending.branch
    ? updateRef(repo, pending.branch, pending.originalHead, 'rebase (abort)', 'kembali ke posisi semula')
    : setHead(repo, { type: 'detached', oid: pending.originalHead }, 'rebase (abort)', 'kembali')

  const files = treeOf(restored.repo, pending.originalHead)

  return {
    repo: { ...restored.repo, index: files, worktree: files, pending: null },
    events: [
      ...restored.events,
      {
        type: 'message',
        tone: 'info',
        text: `Rebase dibatalkan; ${
          pending.branch ? shortRef(pending.branch) : 'HEAD'
        } kembali ke ${pending.originalHead.slice(0, 7)}. Commit yang sempat dibuat masih ada di store dan tercatat di reflog.`,
      },
    ],
  }
}
