/**
 * git-revert(1): "Given one or more existing commits, revert the changes that
 * the related patches introduce, and record some new commits that record them."
 *
 * Record new commits — the history is added to, never rewritten. That is the
 * whole difference between `revert` and `reset` on a published branch, and it is
 * the answer to "how do I undo a commit other people already have".
 *
 * Reverting is a three-way merge with the sides swapped: the base is the commit
 * being undone, and "theirs" is its parent.
 */
import type { Oid } from '@/lib/hash'
import { GitError } from '../errors'
import { mergeTrees } from '../merge-trees'
import { resolveHead } from '../refs'
import { revParseCommit } from '../revparse'
import { requireCommit } from '../store'
import type { CommandResult, Repository } from '../state'
import { readTree, writeTree, type FileMap } from '../tree'
import { commitOnto } from './merge'

function treeOf(repo: Repository, commitOid: Oid): FileMap {
  return readTree(repo.store, requireCommit(repo.store, commitOid).tree)
}

export function revert(repo: Repository, revision: string): CommandResult {
  if (repo.pending) {
    throw new GitError('pending', `masih ada ${repo.pending.type} yang belum selesai`)
  }

  const head = resolveHead(repo.refs, repo.head)
  if (!head) throw new GitError('unborn', 'belum ada commit di branch ini')

  const target = revParseCommit(repo, revision)
  const commit = requireCommit(repo.store, target)

  if (commit.parents.length > 1) {
    throw new GitError(
      'unsupported',
      `${target.slice(0, 7)} adalah merge commit — revert merge butuh -m untuk memilih mainline, dan itu di luar cakupan Cangkok (PRD §4).`,
    )
  }

  const parent = commit.parents[0]
  const undone = mergeTrees(
    treeOf(repo, target),
    treeOf(repo, head),
    parent ? treeOf(repo, parent) : {},
    { ours: 'HEAD', theirs: `parent dari ${target.slice(0, 7)}` },
  )

  if (undone.conflicts.length > 0) {
    throw new GitError(
      'conflict',
      `revert ${target.slice(0, 7)} berkonflik pada ${undone.conflicts.join(', ')} — commit ini sudah diubah lagi sesudahnya`,
    )
  }

  const subject = commit.message.split('\n')[0]
  const written = writeTree(repo.store, undone.files)
  const result = commitOnto(
    { ...repo, store: written.store, index: undone.files, worktree: undone.files },
    {
      tree: written.oid,
      parents: [head],
      // git's own wording, so the log reads the same as a real one.
      message: `Revert "${subject}"\n\nThis reverts commit ${target}.`,
    },
    'revert',
  )

  return {
    repo: result.repo,
    events: [
      ...result.events,
      {
        type: 'message',
        tone: 'info',
        text: `${target.slice(0, 7)} dibatalkan oleh commit baru ${result.oid.slice(0, 7)}. Commit aslinya tetap di riwayat — tidak ada yang ditulis ulang, jadi aman untuk branch yang sudah dipublikasikan.`,
      },
    ],
  }
}
