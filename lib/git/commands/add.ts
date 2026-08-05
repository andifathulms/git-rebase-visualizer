/**
 * git-add(1): "This command updates the index using the current content found
 * in the working tree, to prepare the content staged for the next commit."
 *
 * Staging creates no objects — the blobs are written when the tree is written
 * at commit time — so this only moves content between two file maps in state.
 */
import { GitError } from '../errors'
import type { CommandResult, Repository } from '../state'
import { filePaths, validatePath, type FileMap } from '../tree'

export function add(repo: Repository, paths: readonly string[]): CommandResult {
  const wanted = paths.includes('.') || paths.includes('-A') ? filePaths(repo.worktree) : paths

  if (wanted.length === 0) {
    throw new GitError('bad-args', {
      en: 'add needs a path — use `git add .` for everything',
      id: 'add butuh path — gunakan `git add .` untuk semuanya',
    })
  }

  const index: Record<string, readonly string[]> = { ...repo.index }
  for (const path of wanted) {
    validatePath(path)
    const content = repo.worktree[path]
    if (content === undefined) {
      // git-add(1) errors on a pathspec matching nothing; deletions are staged
      // by removing the entry, which is what an absent working-tree file means.
      if (repo.index[path] === undefined) {
        throw new GitError('bad-path', {
          en: `pathspec '${path}' did not match any file`,
          id: `pathspec '${path}' tidak cocok dengan file mana pun`,
        })
      }
      delete index[path]
    } else {
      index[path] = content
    }
  }

  const staged: FileMap = index
  return {
    repo: { ...repo, index: staged },
    events: [
      {
        type: 'message',
        tone: 'info',
        text: {
          en: `${wanted.length} path(s) staged.`,
          id: `${wanted.length} path di-stage.`,
        },
      },
    ],
  }
}
