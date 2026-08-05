/**
 * git-branch(1). Creating a branch creates no object: it writes one pointer.
 * That is the whole of what a branch is, and the graph draws it as a catalogue
 * card with a string to a box for exactly that reason.
 */
import { GitError } from '../errors'
import { branchRef, headBranch, readRef, shortRef } from '../refs'
import { revParseCommit } from '../revparse'
import type { CommandResult, Repository } from '../state'
import { updateRef } from '../update-ref'

export function createBranch(
  repo: Repository,
  name: string,
  startPoint: string | undefined,
  force = false,
): CommandResult {
  const ref = branchRef(name)
  validateBranchName(name)

  const existing = readRef(repo.refs, ref)
  if (existing !== undefined && !force) {
    throw new GitError('exists', `branch ${name} sudah ada`)
  }

  const target = revParseCommit(repo, startPoint ?? 'HEAD')
  const moved = updateRef(
    repo,
    ref,
    target,
    existing === undefined ? 'branch: Created' : 'branch: Reset',
    startPoint ? `dari ${startPoint}` : 'dari HEAD',
  )

  return {
    repo: moved.repo,
    events: [
      ...moved.events,
      {
        type: 'message',
        tone: 'info',
        text: `Branch ${name} menunjuk ke ${target.slice(0, 7)}.`,
      },
    ],
  }
}

export function deleteBranch(repo: Repository, name: string): CommandResult {
  const ref = branchRef(name)
  const existing = readRef(repo.refs, ref)
  if (existing === undefined) throw new GitError('unknown-ref', `branch ${name} tidak ada`)

  if (headBranch(repo.head) === ref) {
    throw new GitError(
      'checked-out',
      `tidak bisa menghapus ${name} — branch ini sedang di-checkout`,
    )
  }

  const moved = updateRef(repo, ref, null, 'branch: Deleted', `dulu ${existing.slice(0, 7)}`)

  return {
    repo: moved.repo,
    events: [
      ...moved.events,
      {
        type: 'message',
        tone: 'destructive',
        // The commits are still on the shelf; only the card is gone. Saying so
        // is the difference between panic and a two-command recovery.
        text: `Branch ${name} dihapus. Commit-nya masih ada di store dan tercatat di reflog — buat branch baru di ${existing.slice(0, 7)} untuk mengambilnya kembali.`,
      },
    ],
  }
}

export function listBranches(repo: Repository): string[] {
  return Object.keys(repo.refs)
    .filter((ref) => ref.startsWith('refs/heads/'))
    .sort()
    .map(shortRef)
}

/** git-check-ref-format(1), reduced to the rules a sandbox can actually hit. */
export function validateBranchName(name: string): void {
  if (
    name === '' ||
    name.startsWith('-') ||
    name.startsWith('/') ||
    name.endsWith('/') ||
    name.endsWith('.lock') ||
    name.includes('..') ||
    /[\s~^:?*[\\]/.test(name)
  ) {
    throw new GitError('bad-name', `nama branch tidak sah: ${JSON.stringify(name)}`)
  }
}
