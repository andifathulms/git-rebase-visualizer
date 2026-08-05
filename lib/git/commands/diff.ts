/**
 * git-diff(1). Three forms, matching the ones the documentation lists that make
 * sense without a filesystem:
 *
 *   diff                  working tree against the index
 *   diff --staged         index against HEAD
 *   diff <rev>            working tree against that commit
 *   diff <rev> <rev>      one commit against another
 *
 * Read-only: it creates nothing and moves nothing. Worth stating, because the
 * whole point of the object model here is that you can tell which commands do.
 */
import { GitError } from '../errors'
import { diffStat, diffTrees, formatDiff, type FileDiff } from '../diff'
import { resolveHead } from '../refs'
import { revParseCommit } from '../revparse'
import { requireCommit } from '../store'
import type { CommandResult, Repository } from '../state'
import { readTree, type FileMap } from '../tree'

function treeOf(repo: Repository, revision: string): FileMap {
  return readTree(repo.store, requireCommit(repo.store, revParseCommit(repo, revision)).tree)
}

/** The two sides the arguments select, plus how to label them. */
export function diffSides(
  repo: Repository,
  options: { revisions: readonly string[]; staged?: boolean },
): { before: FileMap; after: FileMap; beforeLabel: string; afterLabel: string } {
  const [first, second] = options.revisions

  if (first && second) {
    return {
      before: treeOf(repo, first),
      after: treeOf(repo, second),
      beforeLabel: first,
      afterLabel: second,
    }
  }

  if (first) {
    return {
      before: treeOf(repo, first),
      after: repo.worktree,
      beforeLabel: first,
      afterLabel: 'working tree',
    }
  }

  if (options.staged) {
    const head = resolveHead(repo.refs, repo.head)
    if (!head) {
      throw new GitError('unborn', {
        en: 'there are no commits yet, so there is nothing to compare the index against',
        id: 'belum ada commit, jadi tidak ada pembanding untuk index',
      })
    }
    return {
      before: readTree(repo.store, requireCommit(repo.store, head).tree),
      after: repo.index,
      beforeLabel: 'HEAD',
      afterLabel: 'index',
    }
  }

  return {
    before: repo.index,
    after: repo.worktree,
    beforeLabel: 'index',
    afterLabel: 'working tree',
  }
}

export function diffFiles(
  repo: Repository,
  options: { revisions: readonly string[]; staged?: boolean },
): FileDiff[] {
  const sides = diffSides(repo, options)
  return diffTrees(sides.before, sides.after)
}

export function diff(
  repo: Repository,
  options: { revisions: readonly string[]; staged?: boolean },
): CommandResult {
  const sides = diffSides(repo, options)
  const files = diffTrees(sides.before, sides.after)

  if (files.length === 0) {
    return {
      repo,
      events: [
        {
          type: 'message',
          tone: 'info',
          text: {
            en: `No difference between ${sides.beforeLabel} and ${sides.afterLabel}.`,
            id: `Tidak ada beda antara ${sides.beforeLabel} dan ${sides.afterLabel}.`,
          },
        },
      ],
    }
  }

  const stat = diffStat(files)
  const body = formatDiff(files)

  return {
    repo,
    events: [
      {
        type: 'message',
        tone: 'info',
        text: {
          en: `${body}\n\n${files.length} file(s) changed, ${stat.added} insertion(s), ${stat.removed} deletion(s).`,
          id: `${body}\n\n${files.length} file berubah, ${stat.added} baris ditambah, ${stat.removed} baris dihapus.`,
        },
      },
    ],
  }
}
