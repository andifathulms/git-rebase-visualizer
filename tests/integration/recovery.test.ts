/**
 * The recovery story, end to end. PRD §11: "A user can rebase, see the hashes
 * change, find the originals, and recover one — in under five commands", and
 * "every unreachable commit is recoverable via the reflog until gc".
 */
import { describe, expect, it } from 'vitest'
import { createBranch } from '@/lib/git/commands/branch'
import { checkout } from '@/lib/git/commands/checkout'
import { cherryPick } from '@/lib/git/commands/cherry-pick'
import { gc } from '@/lib/git/commands/gc'
import { rebase } from '@/lib/git/commands/rebase'
import { reset } from '@/lib/git/commands/reset'
import { revert } from '@/lib/git/commands/revert'
import { createTag } from '@/lib/git/commands/tag'
import { orphanedCommits, reachable } from '@/lib/git/reachable'
import { reflogOids } from '@/lib/git/reflog'
import { count, requireCommit } from '@/lib/git/store'
import { revParse } from '@/lib/git/revparse'
import { readTree } from '@/lib/git/tree'
import { commitFile, edit, newRepo, step } from '../helpers/repo'
import { add } from '@/lib/git/commands/add'

describe('reset', () => {
  it('--soft moves HEAD and leaves index and working tree alone', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = commitFile(repo, 'a.txt', ['B'], 'B')
    const after = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'soft' }))

    expect(after.index['a.txt']).toEqual(['B'])
    expect(after.worktree['a.txt']).toEqual(['B'])
    expect(revParse(after, 'HEAD')).toBe(revParse(repo, 'HEAD~1'))
  })

  it('--mixed resets the index but not the working tree', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = commitFile(repo, 'a.txt', ['B'], 'B')
    const after = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'mixed' }))

    expect(after.index['a.txt']).toEqual(['A'])
    expect(after.worktree['a.txt']).toEqual(['B'])
  })

  it('--hard resets both, and removes no object', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = commitFile(repo, 'a.txt', ['B'], 'B')
    const lost = revParse(repo, 'HEAD')
    const objectsBefore = count(repo.store)

    const after = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'hard' }))

    expect(after.index['a.txt']).toEqual(['A'])
    expect(after.worktree['a.txt']).toEqual(['A'])
    expect(count(after.store)).toBe(objectsBefore)
    expect(orphanedCommits(after)).toContain(lost)
  })

  it('recovers a hard reset in one command, via the reflog', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = commitFile(repo, 'a.txt', ['B'], 'B')
    const lost = revParse(repo, 'HEAD')

    repo = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'hard' }))
    expect(revParse(repo, 'HEAD@{1}')).toBe(lost)

    const recovered = step(repo, (r) => reset(r, { revision: 'HEAD@{1}', mode: 'hard' }))
    expect(revParse(recovered, 'HEAD')).toBe(lost)
    expect(recovered.worktree['a.txt']).toEqual(['B'])
  })
})

describe('revert adds to history rather than rewriting it', () => {
  it('records a new commit and keeps the original', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = commitFile(repo, 'a.txt', ['A', 'B'], 'tambah B')
    const target = revParse(repo, 'HEAD')

    const after = step(repo, (r) => revert(r, 'HEAD'))
    const tip = requireCommit(after.store, revParse(after, 'HEAD'))

    expect(tip.parents).toEqual([target])
    expect(tip.message).toContain('Revert "tambah B"')
    expect(readTree(after.store, tip.tree)['a.txt']).toEqual(['A'])
    expect(orphanedCommits(after)).toEqual([])
  })
})

describe('cherry-pick copies a commit', () => {
  it('creates a new object and leaves the source untouched', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = step(repo, (r) => createBranch(r, 'fitur', undefined))
    repo = step(repo, (r) => checkout(r, { target: 'fitur' }))
    repo = commitFile(repo, 'fitur.txt', ['bagus'], 'perbaikan')
    const source = revParse(repo, 'HEAD')

    repo = step(repo, (r) => checkout(r, { target: 'main' }))
    const after = step(repo, (r) => cherryPick(r, ['fitur']))

    const copy = revParse(after, 'HEAD')
    expect(copy).not.toBe(source)
    expect(requireCommit(after.store, copy).message).toBe(requireCommit(after.store, source).message)
    expect(requireCommit(after.store, copy).author).toEqual(requireCommit(after.store, source).author)
    // Both exist, and both are reachable — nothing was orphaned.
    expect(reachable(after).has(source)).toBe(true)
    expect(orphanedCommits(after)).toEqual([])
  })
})

describe('tags', () => {
  it('a lightweight tag creates no object; an annotated one does', () => {
    const repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')

    const light = step(repo, (r) => createTag(r, { name: 'v1' }))
    expect(count(light.store)).toBe(count(repo.store))
    expect(revParse(light, 'v1')).toBe(revParse(repo, 'HEAD'))

    const annotated = step(light, (r) => createTag(r, { name: 'v2', message: 'rilis' }))
    expect(count(annotated.store)).toBe(count(repo.store) + 1)
    expect(revParse(annotated, 'v2')).not.toBe(revParse(repo, 'HEAD'))
    expect(revParse(annotated, 'v2^{commit}')).toBe(revParse(repo, 'HEAD'))
  })
})

describe('gc is the only thing that removes', () => {
  it('keeps orphans while the reflog still names them', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = commitFile(repo, 'a.txt', ['B'], 'B')
    const lost = revParse(repo, 'HEAD')
    repo = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'hard' }))

    expect(reflogOids(repo.reflog)).toContain(lost)
    const swept = step(repo, (r) => gc(r))
    expect(swept.store.objects[lost]).toBeDefined()
  })

  it('sweeps them once the reflog is expired, and only then', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = commitFile(repo, 'a.txt', ['B'], 'B')
    const lost = revParse(repo, 'HEAD')
    repo = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'hard' }))

    const swept = gc(repo, { expireReflog: true }).repo
    expect(swept.store.objects[lost]).toBeUndefined()
    // Everything still reachable survived.
    expect(swept.store.objects[revParse(swept, 'HEAD')]).toBeDefined()
  })
})

describe('the five-command story from PRD §11', () => {
  it('rebase, see new hashes, find the original, recover it', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = step(repo, (r) => createBranch(r, 'fitur', undefined))
    repo = commitFile(repo, 'main.txt', ['B'], 'B')
    repo = step(repo, (r) => checkout(r, { target: 'fitur' }))
    repo = edit(repo, 'fitur.txt', ['kerja keras'])
    repo = step(repo, (r) => add(r, ['fitur.txt']))
    repo = commitFile(repo, 'fitur.txt', ['kerja keras'], 'kerja keras')

    const original = revParse(repo, 'HEAD')

    // 1. rebase
    repo = step(repo, (r) => rebase(r, { upstream: 'main' }))
    expect(revParse(repo, 'HEAD')).not.toBe(original)

    // 2. the original is still there, just unstrung
    expect(orphanedCommits(repo)).toContain(original)

    // 3. recover it with a branch, exactly as in real git
    repo = step(repo, (r) => createBranch(r, 'penyelamat', original))
    expect(reachable(repo).has(original)).toBe(true)
    expect(readTree(repo.store, requireCommit(repo.store, original).tree)['fitur.txt']).toEqual([
      'kerja keras',
    ])
  })
})
