/**
 * git-merge(1): "Incorporates changes from the named commits ... into the
 * current branch."
 *
 * Three outcomes, and the difference between them is the lesson:
 *   - already up to date — theirs is an ancestor, nothing to do, no object;
 *   - fast-forward — HEAD is the merge base, so the card simply slides forward
 *     and *no commit object is created*;
 *   - a real merge — a new commit with two parents, and both histories intact.
 *
 * Nothing is rewritten in any of the three. That is what makes merge the safe
 * counterpart to rebase, and it is why the comparison view puts them together.
 */
import type { Oid } from '@/lib/hash'
import { GitError } from '../errors'
import { mergeBase } from '../merge-base'
import { hasConflictMarkers } from '../merge3'
import { mergeTrees } from '../merge-trees'
import { makeCommit } from '../objects'
import { resolveHead, shortRef } from '../refs'
import { revParseCommit } from '../revparse'
import { put, requireCommit } from '../store'
import { tick, type CommandResult, type GitEvent, type Repository } from '../state'
import { readTree, writeTree, type FileMap } from '../tree'
import { setHead, updateRef } from '../update-ref'
import { checkoutContent } from './checkout'

function treeOf(repo: Repository, commitOid: Oid): FileMap {
  return readTree(repo.store, requireCommit(repo.store, commitOid).tree)
}

/** Records a new commit and moves whatever HEAD is attached to. */
export function commitOnto(
  repo: Repository,
  input: { tree: Oid; parents: readonly Oid[]; message: string },
  operation: string,
): { repo: Repository; events: GitEvent[]; oid: Oid } {
  const ticked = tick(repo)
  const object = makeCommit({
    tree: input.tree,
    parents: input.parents,
    author: ticked.signature,
    committer: ticked.signature,
    message: input.message,
  })

  let next = { ...ticked.repo, store: put(ticked.repo.store, object) }
  const events: GitEvent[] = [{ type: 'object-created', oid: object.oid, kind: 'commit' }]

  const detail = `${operation}: ${input.message.split('\n')[0]}`
  const moved =
    next.head.type === 'attached'
      ? updateRef(next, next.head.ref, object.oid, operation, detail)
      : setHead(next, { type: 'detached', oid: object.oid }, operation, detail)

  next = moved.repo
  events.push(...moved.events)
  return { repo: next, events, oid: object.oid }
}

export function merge(
  repo: Repository,
  options: { revision: string; noFastForward?: boolean; message?: string },
): CommandResult {
  if (repo.pending) {
    throw new GitError(
      'pending',
      `masih ada ${repo.pending.type} yang belum selesai — selesaikan dengan --continue atau batalkan dengan --abort`,
    )
  }

  const headOid = resolveHead(repo.refs, repo.head)
  if (!headOid) throw new GitError('unborn', 'belum ada commit di branch ini')

  const theirs = revParseCommit(repo, options.revision)
  const base = mergeBase(repo.store, headOid, theirs)

  if (base === theirs) {
    return {
      repo,
      events: [{ type: 'message', tone: 'info', text: 'Sudah mutakhir — tidak ada objek baru.' }],
    }
  }

  const label =
    repo.head.type === 'attached' ? shortRef(repo.head.ref) : `HEAD (${headOid.slice(0, 7)})`
  const message = options.message ?? `Merge ${options.revision} into ${label}`

  if (base === headOid && !options.noFastForward) {
    // git-merge(1): "when the current branch is a descendant of the other ...
    // no new commit is created". Nothing is written; only the card moves.
    const content = checkoutContent(repo, theirs)
    const moved =
      repo.head.type === 'attached'
        ? updateRef({ ...repo, ...content }, repo.head.ref, theirs, 'merge', 'fast-forward')
        : setHead({ ...repo, ...content }, { type: 'detached', oid: theirs }, 'merge', 'fast-forward')

    return {
      repo: moved.repo,
      events: [
        ...moved.events,
        {
          type: 'message',
          tone: 'info',
          text: `Fast-forward ke ${theirs.slice(0, 7)}. Tidak ada commit baru dibuat — kartu branch hanya bergeser.`,
        },
      ],
    }
  }

  const merged = mergeTrees(
    base ? treeOf(repo, base) : {},
    treeOf(repo, headOid),
    treeOf(repo, theirs),
    { ours: label, theirs: options.revision },
  )

  if (merged.conflicts.length > 0) {
    return {
      repo: {
        ...repo,
        index: merged.files,
        worktree: merged.files,
        pending: {
          type: 'merge',
          theirs,
          theirsLabel: options.revision,
          message,
          conflicts: merged.conflicts,
        },
      },
      events: [
        { type: 'conflict', paths: merged.conflicts },
        {
          type: 'message',
          tone: 'warn',
          text: `Konflik pada ${merged.conflicts.join(', ')}. Belum ada ref yang bergerak dan belum ada commit dibuat. Selesaikan file, \`add\`, lalu \`merge --continue\` — atau \`merge --abort\`.`,
        },
      ],
    }
  }

  const written = writeTree(repo.store, merged.files)
  const result = commitOnto(
    { ...repo, store: written.store, index: merged.files, worktree: merged.files },
    { tree: written.oid, parents: [headOid, theirs], message },
    'merge',
  )

  return {
    repo: result.repo,
    events: [
      ...result.events,
      {
        type: 'message',
        tone: 'info',
        // The point of the comparison view, stated where it happens.
        text: `Merge commit ${result.oid.slice(0, 7)} dibuat dengan dua parent. Riwayat lama tetap utuh — tidak ada commit yang ditulis ulang.`,
      },
    ],
  }
}

export function mergeContinue(repo: Repository): CommandResult {
  const pending = repo.pending
  if (!pending || pending.type !== 'merge') {
    throw new GitError('no-merge', 'tidak ada merge yang sedang berjalan')
  }

  const unresolved = pending.conflicts.filter((path) => {
    const staged = repo.index[path]
    return staged === undefined ? false : hasConflictMarkers(staged)
  })
  if (unresolved.length > 0) {
    throw new GitError(
      'unresolved',
      `masih ada penanda konflik di ${unresolved.join(', ')} — perbaiki lalu \`add\` file-nya`,
    )
  }

  const headOid = resolveHead(repo.refs, repo.head)
  if (!headOid) throw new GitError('unborn', 'belum ada commit di branch ini')

  const written = writeTree(repo.store, repo.index)
  const result = commitOnto(
    { ...repo, store: written.store, pending: null },
    { tree: written.oid, parents: [headOid, pending.theirs], message: pending.message },
    'merge',
  )

  return {
    repo: result.repo,
    events: [
      ...result.events,
      {
        type: 'message',
        tone: 'info',
        text: `Merge selesai sebagai ${result.oid.slice(0, 7)}. Resolusi Anda ikut masuk ke tree, jadi hash-nya mencerminkan keputusan itu.`,
      },
    ],
  }
}

export function mergeAbort(repo: Repository): CommandResult {
  const pending = repo.pending
  if (!pending || pending.type !== 'merge') {
    throw new GitError('no-merge', 'tidak ada merge yang sedang berjalan')
  }

  const headOid = resolveHead(repo.refs, repo.head)
  const files = headOid ? treeOf(repo, headOid) : {}

  return {
    repo: { ...repo, index: files, worktree: files, pending: null },
    events: [
      {
        type: 'message',
        tone: 'info',
        // Nothing to undo in the store: the merge never wrote an object.
        text: 'Merge dibatalkan. Tidak ada objek yang perlu dihapus — merge yang berhenti di konflik memang belum menulis apa pun.',
      },
    ],
  }
}
