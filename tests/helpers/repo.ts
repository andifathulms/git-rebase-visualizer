/**
 * Test scaffolding. Every command run through `step` asserts the append-only
 * property afterwards — that is the CLAUDE.md rule that it is not a separate
 * suite but an assertion after every command in every test.
 */
import { add } from '@/lib/git/commands/add'
import { commit } from '@/lib/git/commands/commit'
import { emptyRepository, type CommandResult, type Repository } from '@/lib/git/state'
import { expectAppendOnly, snapshotStore } from './store-invariants'

export function newRepo(): Repository {
  return emptyRepository()
}

/** Runs a command and checks the store only grew. Returns the new repository. */
export function step(repo: Repository, action: (repo: Repository) => CommandResult): Repository {
  const before = snapshotStore(repo.store)
  const result = action(repo)
  expectAppendOnly(before, result.repo.store)
  return result.repo
}

export function edit(repo: Repository, path: string, lines: readonly string[]): Repository {
  return { ...repo, worktree: { ...repo.worktree, [path]: lines } }
}

export function remove(repo: Repository, path: string): Repository {
  const worktree = { ...repo.worktree }
  delete worktree[path]
  return { ...repo, worktree }
}

/** Edit, stage, commit — the loop most scenarios are built out of. */
export function commitFile(
  repo: Repository,
  path: string,
  lines: readonly string[],
  message: string,
): Repository {
  const edited = edit(repo, path, lines)
  const staged = step(edited, (r) => add(r, [path]))
  return step(staged, (r) => commit(r, { message }))
}
