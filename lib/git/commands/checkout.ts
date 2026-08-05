/**
 * git-checkout(1) / git-switch(1).
 *
 * Checkout changes what HEAD points at — usually a branch, which is why HEAD is
 * a pointer to a pointer. Detaching is the same command pointing HEAD straight
 * at a commit, and it is where work gets stranded, so it says so.
 *
 * The safety rule is the documented one, not an approximation:
 * git-checkout(1) — "it is an error if the working tree differs from the branch
 * being switched to for files that differ between HEAD and the target."
 * Local changes to files that do *not* differ between the two commits are
 * carried across, exactly as git carries them.
 */
import type { Oid } from '@/lib/hash'
import { GitError } from '../errors'
import { branchRef, readRef, resolveHead, shortRef } from '../refs'
import { revParse, revParseCommit } from '../revparse'
import { requireCommit } from '../store'
import type { CommandResult, GitEvent, Repository } from '../state'
import { filePaths, readTree, type FileMap } from '../tree'
import { setHead } from '../update-ref'
import { createBranch } from './branch'

function treeFiles(repo: Repository, commitOid: Oid | undefined): FileMap {
  if (!commitOid) return {}
  return readTree(repo.store, requireCommit(repo.store, commitOid).tree)
}

function sameContent(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  if (a === undefined || b === undefined) return a === b
  return a.length === b.length && a.every((line, i) => line === b[i])
}

/**
 * Applies a target commit's content to the index and working tree, refusing
 * when that would discard a local change to a path the switch would touch.
 */
export function checkoutContent(
  repo: Repository,
  targetCommit: Oid,
): { index: FileMap; worktree: FileMap } {
  const current = treeFiles(repo, resolveHead(repo.refs, repo.head))
  const target = treeFiles(repo, targetCommit)

  const touched = [...new Set([...filePaths(current), ...filePaths(target)])]
    .sort()
    .filter((path) => !sameContent(current[path], target[path]))

  const dirty = touched.filter(
    (path) =>
      !sameContent(current[path], repo.worktree[path]) ||
      !sameContent(current[path], repo.index[path]),
  )

  if (dirty.length > 0) {
    throw new GitError('local-changes', {
      en: `local changes to ${dirty.join(', ')} would be overwritten by checkout — commit or discard them first`,
      id: `perubahan lokal pada ${dirty.join(', ')} akan tertimpa oleh checkout — commit atau buang dulu`,
    })
  }

  const index: Record<string, readonly string[]> = {}
  const worktree: Record<string, readonly string[]> = {}

  // Start from the target, then carry across untouched local modifications.
  for (const path of filePaths(target)) {
    index[path] = target[path]
    worktree[path] = target[path]
  }
  for (const path of filePaths(repo.worktree)) {
    if (touched.includes(path)) continue
    worktree[path] = repo.worktree[path]
  }
  for (const path of filePaths(repo.index)) {
    if (touched.includes(path)) continue
    index[path] = repo.index[path]
  }

  return { index, worktree }
}

export function checkout(
  repo: Repository,
  options: { target: string; create?: boolean; detach?: boolean },
): CommandResult {
  const events: GitEvent[] = []
  let working = repo

  if (options.create) {
    const created = createBranch(repo, options.target, undefined, false)
    working = created.repo
    events.push(...created.events)
  }

  const branch = branchRef(options.target)
  const isBranch = !options.detach && readRef(working.refs, branch) !== undefined
  const commitOid = isBranch
    ? revParseCommit(working, branch)
    : revParseCommit(working, options.target)

  const content = checkoutContent(working, commitOid)
  working = { ...working, ...content }

  if (isBranch) {
    const moved = setHead(
      working,
      { type: 'attached', ref: branch },
      'checkout',
      `ke branch ${shortRef(branch)}`,
    )
    return {
      repo: moved.repo,
      events: [
        ...events,
        ...moved.events,
        {
          type: 'message',
          tone: 'info',
          text: {
            en: `Switched to branch ${shortRef(branch)}. HEAD is now attached to the branch card, not to a commit.`,
            id: `Berpindah ke branch ${shortRef(branch)}. HEAD sekarang menempel pada kartu branch, bukan pada commit.`,
          },
        },
      ],
    }
  }

  // Detached: resolve through revParse first so `checkout v1.0` on a tag says
  // what it landed on.
  revParse(working, options.target)
  const moved = setHead(
    working,
    { type: 'detached', oid: commitOid },
    'checkout',
    `detached di ${commitOid.slice(0, 7)}`,
  )

  return {
    repo: moved.repo,
    events: [
      ...events,
      ...moved.events,
      {
        type: 'message',
        tone: 'warn',
        text: {
          en: `HEAD detached at ${commitOid.slice(0, 7)}. Commits made here have no branch following them — move away again and they become orphans (still recoverable through the reflog).`,
          id: `HEAD detached di ${commitOid.slice(0, 7)}. Commit yang dibuat di sini tidak diikuti branch mana pun — kalau Anda pindah lagi, commit itu jadi yatim (masih bisa diambil lewat reflog).`,
        },
      },
    ],
  }
}
