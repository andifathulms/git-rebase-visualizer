/**
 * git-rebase(1), "Interactive Mode". The todo list arrives as a single
 * `--todo=` token so an interactive rebase stays replayable and shareable.
 */
import { describe, expect, it } from 'vitest'
import { planRebase } from '@/lib/git/commands/rebase'
import { execute } from '@/lib/git/execute'
import { orphanedCommits } from '@/lib/git/reachable'
import { revParse } from '@/lib/git/revparse'
import { history } from '@/lib/git/query'
import { requireCommit } from '@/lib/git/store'
import { readTree } from '@/lib/git/tree'
import type { Repository } from '@/lib/git/state'
import { createBranch } from '@/lib/git/commands/branch'
import { checkout } from '@/lib/git/commands/checkout'
import { commitFile, newRepo, step } from '../helpers/repo'

/**
 * main: A, U.  rapikan: A, F1, F2, F3.
 *
 * Each feature commit touches its own file. That matters: reordering or
 * dropping commits that all edit the same line conflicts in real git too, so a
 * shared-file fixture would be testing the conflict path rather than the todo
 * list.
 */
function messy(): Repository {
  let repo = commitFile(newRepo(), 'app.txt', ['v1'], 'A')
  repo = step(repo, (r) => createBranch(r, 'rapikan', undefined))
  repo = commitFile(repo, 'main.txt', ['U'], 'U')
  repo = step(repo, (r) => checkout(r, { target: 'rapikan' }))
  repo = commitFile(repo, 'f1.txt', ['satu'], 'F1')
  repo = commitFile(repo, 'f2.txt', ['dua'], 'F2')
  repo = commitFile(repo, 'f3.txt', ['tiga'], 'F3')
  return repo
}

function todoLine(repo: Repository, actions: readonly string[]): string {
  const steps = planRebase(repo, { upstream: 'main' }).steps
  expect(steps).toHaveLength(actions.length)
  return `rebase -i main --todo=${steps
    .map((planStep, index) => `${actions[index]}:${planStep.oid}`)
    .join(',')}`
}

describe('interactive rebase', () => {
  it('plans upstream..HEAD oldest first, as git presents it', () => {
    const repo = messy()
    const steps = planRebase(repo, { upstream: 'main' }).steps
    expect(steps.map((planStep) => requireCommit(repo.store, planStep.oid).message.trim())).toEqual([
      'F1',
      'F2',
      'F3',
    ])
    expect(steps.every((planStep) => planStep.action === 'pick')).toBe(true)
  })

  it('squashes three commits into one, creating new objects for all of them', () => {
    const repo = messy()
    const after = execute(repo, todoLine(repo, ['pick', 'squash', 'squash'])).repo

    const chain = history(after, [revParse(after, 'rapikan')])
    expect(chain.map((commit) => commit.message.split('\n')[0])).toEqual(['F1', 'U', 'A'])

    // One commit carrying all three changes.
    const tree = readTree(after.store, chain[0].tree)
    expect(Object.keys(tree).sort()).toEqual(['app.txt', 'f1.txt', 'f2.txt', 'f3.txt', 'main.txt'])

    // Five orphans, not three: the three originals plus the two intermediate
    // commits each squash step replaced. Squash does not amend anything — it
    // writes a new commit and abandons the previous one, like everything else
    // in this engine.
    expect(orphanedCommits(after)).toHaveLength(5)
  })

  it('fixup discards the message, squash keeps both', () => {
    const repo = messy()
    const squashed = execute(repo, todoLine(repo, ['pick', 'squash', 'pick'])).repo
    const fixed = execute(repo, todoLine(repo, ['pick', 'fixup', 'pick'])).repo

    const squashedMessage = requireCommit(squashed.store, revParse(squashed, 'rapikan~1')).message
    const fixedMessage = requireCommit(fixed.store, revParse(fixed, 'rapikan~1')).message

    expect(squashedMessage).toContain('F1')
    expect(squashedMessage).toContain('F2')
    expect(fixedMessage).toContain('F1')
    expect(fixedMessage).not.toContain('F2')
  })

  it('drop leaves the commit out but leaves the object in the store', () => {
    const repo = messy()
    const dropped = planRebase(repo, { upstream: 'main' }).steps[1].oid
    const after = execute(repo, todoLine(repo, ['pick', 'drop', 'pick'])).repo

    expect(history(after, [revParse(after, 'rapikan')]).map((c) => c.message.trim())).toEqual([
      'F3',
      'F1',
      'U',
      'A',
    ])
    expect(after.store.objects[dropped]).toBeDefined()
    expect(readTree(after.store, requireCommit(after.store, revParse(after, 'rapikan')).tree)['f2.txt']).toBeUndefined()
  })

  it('reorders steps', () => {
    const repo = messy()
    const steps = planRebase(repo, { upstream: 'main' }).steps
    const reordered = [steps[2], steps[0], steps[1]]
    const after = execute(
      repo,
      `rebase -i main --todo=${reordered.map((s) => `pick:${s.oid}`).join(',')}`,
    ).repo

    expect(history(after, [revParse(after, 'rapikan')]).map((c) => c.message.trim())).toEqual([
      'F2',
      'F1',
      'F3',
      'U',
      'A',
    ])
  })

  it('applies a reword message', () => {
    const repo = messy()
    const steps = planRebase(repo, { upstream: 'main' }).steps
    const after = execute(
      repo,
      `rebase -i main --todo=pick:${steps[0].oid},pick:${steps[1].oid},reword:${
        steps[2].oid
      }:${encodeURIComponent('judul yang lebih baik')}`,
    ).repo

    expect(requireCommit(after.store, revParse(after, 'rapikan')).message.trim()).toBe(
      'judul yang lebih baik',
    )
  })

  it('rejects a malformed todo by name rather than guessing', () => {
    const repo = messy()
    expect(() => execute(repo, 'rebase -i main --todo=squish:abcd')).toThrow(/bukan aksi todo/)
    expect(() => execute(repo, 'rebase -i main --todo=pick:abcd')).toThrow(/40 karakter/)
  })

  it('refuses a bare rebase -i, pointing at the panel', () => {
    expect(() => execute(messy(), 'rebase -i main')).toThrow(/panel/)
  })

  it('refuses squash as the first step, which has nothing to squash into', () => {
    const repo = messy()
    expect(() => execute(repo, todoLine(repo, ['squash', 'pick', 'pick']))).toThrow(
      /tidak boleh jadi langkah pertama/,
    )
  })
})
