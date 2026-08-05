import { describe, expect, it } from 'vitest'
import { add } from '@/lib/git/commands/add'
import { createBranch } from '@/lib/git/commands/branch'
import { checkout } from '@/lib/git/commands/checkout'
import { merge, mergeAbort, mergeContinue } from '@/lib/git/commands/merge'
import { rebase, rebaseAbort, rebaseContinue, rebaseSkip } from '@/lib/git/commands/rebase'
import { hasConflictMarkers } from '@/lib/git/merge3'
import { count, requireCommit } from '@/lib/git/store'
import type { Repository } from '@/lib/git/state'
import { commitFile, edit, newRepo, step } from '../helpers/repo'

/** Both branches change the same line of the same file, from a common base. */
function conflicting(): Repository {
  let repo = commitFile(newRepo(), 'a.txt', ['satu', 'dua', 'tiga'], 'awal')
  repo = step(repo, (r) => createBranch(r, 'fitur', undefined))
  repo = commitFile(repo, 'a.txt', ['satu', 'versi main', 'tiga'], 'main mengubah dua')
  repo = step(repo, (r) => checkout(r, { target: 'fitur' }))
  repo = commitFile(repo, 'a.txt', ['satu', 'versi fitur', 'tiga'], 'fitur mengubah dua')
  return repo
}

describe('merge conflicts', () => {
  it('stops without moving a ref or writing an object', () => {
    const repo = step(conflicting(), (r) => checkout(r, { target: 'main' }))
    const objectsBefore = count(repo.store)
    const refsBefore = repo.refs

    const stopped = step(repo, (r) => merge(r, { revision: 'fitur' }))

    expect(stopped.pending?.type).toBe('merge')
    expect(stopped.refs).toEqual(refsBefore)
    expect(count(stopped.store)).toBe(objectsBefore)
    expect(hasConflictMarkers(stopped.worktree['a.txt'])).toBe(true)
  })

  it('refuses to continue while markers remain', () => {
    let repo = step(conflicting(), (r) => checkout(r, { target: 'main' }))
    repo = step(repo, (r) => merge(r, { revision: 'fitur' }))
    repo = step(repo, (r) => add(r, ['a.txt']))

    expect(() => mergeContinue(repo)).toThrow(/conflict markers/)
  })

  it('commits the resolution, and the hash reflects it', () => {
    let repo = step(conflicting(), (r) => checkout(r, { target: 'main' }))
    repo = step(repo, (r) => merge(r, { revision: 'fitur' }))

    repo = edit(repo, 'a.txt', ['satu', 'gabungan tangan', 'tiga'])
    repo = step(repo, (r) => add(r, ['a.txt']))
    const resolved = step(repo, (r) => mergeContinue(r))

    const tip = requireCommit(resolved.store, resolved.refs['refs/heads/main'])
    expect(tip.parents).toHaveLength(2)
    expect(resolved.pending).toBeNull()

    // A different resolution would have produced a different tree and so a
    // different commit id — that is the point of asserting it here.
    let other = step(conflicting(), (r) => checkout(r, { target: 'main' }))
    other = step(other, (r) => merge(r, { revision: 'fitur' }))
    other = edit(other, 'a.txt', ['satu', 'resolusi lain', 'tiga'])
    other = step(other, (r) => add(r, ['a.txt']))
    const otherResolved = step(other, (r) => mergeContinue(r))

    expect(requireCommit(otherResolved.store, otherResolved.refs['refs/heads/main']).oid).not.toBe(tip.oid)
  })

  it('aborts with nothing to undo in the store', () => {
    let repo = step(conflicting(), (r) => checkout(r, { target: 'main' }))
    const objectsBefore = count(repo.store)
    repo = step(repo, (r) => merge(r, { revision: 'fitur' }))
    const aborted = step(repo, (r) => mergeAbort(r))

    expect(aborted.pending).toBeNull()
    expect(count(aborted.store)).toBe(objectsBefore)
    expect(aborted.worktree['a.txt']).toEqual(['satu', 'versi main', 'tiga'])
  })
})

describe('rebase conflicts', () => {
  it('stops mid-replay and can be continued', () => {
    let repo = conflicting()
    const originalTip = repo.refs['refs/heads/fitur']

    repo = step(repo, (r) => rebase(r, { upstream: 'main' }))
    expect(repo.pending?.type).toBe('rebase')

    repo = edit(repo, 'a.txt', ['satu', 'gabungan', 'tiga'])
    repo = step(repo, (r) => add(r, ['a.txt']))
    const done = step(repo, (r) => rebaseContinue(r))

    expect(done.pending).toBeNull()
    expect(done.refs['refs/heads/fitur']).not.toBe(originalTip)
    expect(done.worktree['a.txt']).toEqual(['satu', 'gabungan', 'tiga'])
    // The original is still on the shelf.
    expect(done.store.objects[originalTip]).toBeDefined()
  })

  it('puts the branch back exactly where it was on abort', () => {
    let repo = conflicting()
    const originalTip = repo.refs['refs/heads/fitur']

    repo = step(repo, (r) => rebase(r, { upstream: 'main' }))
    const aborted = step(repo, (r) => rebaseAbort(r))

    expect(aborted.refs['refs/heads/fitur']).toBe(originalTip)
    expect(aborted.pending).toBeNull()
    expect(aborted.worktree['a.txt']).toEqual(['satu', 'versi fitur', 'tiga'])
  })

  it('drops the offending commit on skip', () => {
    let repo = conflicting()
    repo = step(repo, (r) => rebase(r, { upstream: 'main' }))
    const skipped = step(repo, (r) => rebaseSkip(r))

    expect(skipped.pending).toBeNull()
    // Skipping the only replayed commit leaves fitur sitting on main's tip.
    expect(skipped.refs['refs/heads/fitur']).toBe(skipped.refs['refs/heads/main'])
    expect(skipped.worktree['a.txt']).toEqual(['satu', 'versi main', 'tiga'])
  })

  it('refuses a second operation while one is pending', () => {
    let repo = conflicting()
    repo = step(repo, (r) => rebase(r, { upstream: 'main' }))
    expect(() => merge(repo, { revision: 'main' })).toThrow(/still in progress/)
  })
})
