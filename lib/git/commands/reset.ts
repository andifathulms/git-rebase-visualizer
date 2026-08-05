/**
 * git-reset(1). The three modes differ in exactly one axis each, and the
 * documentation is quoted rather than recalled, because this is the classic
 * place memory fails:
 *
 *   --soft  "Does not touch the index file or the working tree at all (but
 *            resets the head to <commit> ...)."
 *   --mixed "Resets the index but not the working tree (i.e., the changed files
 *            are preserved but not marked for commit) ... This is the default."
 *   --hard  "Resets the index and working tree. Any changes to tracked files in
 *            the working tree since <commit> are discarded."
 *
 * Note what none of them do: remove an object. `reset --hard` is the operation
 * people describe as losing work, and the whole point of showing it here is
 * that the commits are still on the shelf and still named by the reflog.
 */
import { GitError } from '../errors'
import { orphanedCommits } from '../reachable'
import { resolveHead } from '../refs'
import { revParseCommit } from '../revparse'
import { requireCommit } from '../store'
import type { CommandResult, GitEvent, Repository } from '../state'
import { readTree } from '../tree'
import { setHead, updateRef } from '../update-ref'
import type { ResetMode } from './types'

export function reset(
  repo: Repository,
  options: { revision: string; mode: ResetMode },
): CommandResult {
  const previous = resolveHead(repo.refs, repo.head)
  if (!previous) throw new GitError('unborn', {
      en: 'there is no commit to reset from yet',
      id: 'belum ada commit untuk di-reset',
    })

  const target = revParseCommit(repo, options.revision)
  const targetFiles = readTree(repo.store, requireCommit(repo.store, target).tree)

  const moved =
    repo.head.type === 'attached'
      ? updateRef(repo, repo.head.ref, target, `reset --${options.mode}`, `ke ${target.slice(0, 7)}`)
      : setHead(repo, { type: 'detached', oid: target }, `reset --${options.mode}`, `ke ${target.slice(0, 7)}`)

  let next: Repository = moved.repo
  switch (options.mode) {
    case 'soft':
      break
    case 'mixed':
      next = { ...next, index: targetFiles }
      break
    case 'hard':
      next = { ...next, index: targetFiles, worktree: targetFiles }
      break
  }

  const events: GitEvent[] = [...moved.events]
  const orphans = orphanedCommits(next)
  if (orphans.length > 0) events.push({ type: 'commits-orphaned', oids: orphans })

  events.push({
    type: 'message',
    tone: options.mode === 'hard' ? 'destructive' : 'info',
    text:
      options.mode === 'hard'
        ? {
            en: `HEAD moved to ${target.slice(0, 7)} and the working tree was overwritten. Commit ${previous.slice(0, 7)} is no longer pointed at by anything, but it is still in the store — \`reset --hard ${previous.slice(0, 7)}\` or the reflog will bring it back.`,
            id: `HEAD dipindah ke ${target.slice(0, 7)} dan working tree ditimpa. Commit ${previous.slice(0, 7)} tidak lagi ditunjuk siapa pun, tapi masih ada di store — \`reset --hard ${previous.slice(0, 7)}\` atau reflog akan mengembalikannya.`,
          }
        : {
            en: `HEAD moved to ${target.slice(0, 7)}. ${
              options.mode === 'soft'
                ? 'The index and working tree were not touched, so your changes are still staged.'
                : 'The index was reset; the working tree was not touched.'
            }`,
            id: `HEAD dipindah ke ${target.slice(0, 7)}. ${
              options.mode === 'soft'
                ? 'Index dan working tree tidak disentuh, jadi perubahan Anda tetap ter-stage.'
                : 'Index disetel ulang; working tree tidak disentuh.'
            }`,
          },
  })

  return { repo: next, events }
}
