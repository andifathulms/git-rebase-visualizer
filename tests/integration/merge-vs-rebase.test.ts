/**
 * The teaching property, asserted rather than claimed: for a conflict-free
 * integration, merge and rebase produce **identical final trees and different
 * history shapes**. PRD §8. This is both the correctness test and the thing the
 * comparison view exists to show.
 */
import { describe, expect, it } from 'vitest'
import { createBranch } from '@/lib/git/commands/branch'
import { checkout } from '@/lib/git/commands/checkout'
import { merge } from '@/lib/git/commands/merge'
import { rebase } from '@/lib/git/commands/rebase'
import { orphanedCommits, reachable } from '@/lib/git/reachable'
import { count, requireCommit } from '@/lib/git/store'
import { readTree } from '@/lib/git/tree'
import type { Repository } from '@/lib/git/state'
import { commitFile, newRepo, step } from '../helpers/repo'

/**
 *   A ── B            (main)
 *    \
 *     C ── D          (fitur)
 *
 * B, C and D touch different files, so the integration is conflict-free.
 */
function diverged(): Repository {
  let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
  repo = step(repo, (r) => createBranch(r, 'fitur', undefined))
  repo = commitFile(repo, 'main.txt', ['B'], 'B')
  repo = step(repo, (r) => checkout(r, { target: 'fitur' }))
  repo = commitFile(repo, 'fitur.txt', ['C'], 'C')
  repo = commitFile(repo, 'fitur.txt', ['C', 'D'], 'D')
  return repo
}

describe('merge and rebase agree on content and disagree on shape', () => {
  it('produces identical final trees', () => {
    const start = diverged()

    const merged = step(step(start, (r) => checkout(r, { target: 'main' })), (r) =>
      merge(r, { revision: 'fitur' }),
    )
    const rebased = step(start, (r) => rebase(r, { upstream: 'main' }))

    const mergedTree = readTree(merged.store, requireCommit(merged.store, merged.refs['refs/heads/main']).tree)
    const rebasedTree = readTree(rebased.store, requireCommit(rebased.store, rebased.refs['refs/heads/fitur']).tree)

    expect(rebasedTree).toEqual(mergedTree)
    expect(mergedTree['main.txt']).toEqual(['B'])
    expect(mergedTree['fitur.txt']).toEqual(['C', 'D'])
  })

  it('produces different history shapes', () => {
    const start = diverged()

    const merged = step(step(start, (r) => checkout(r, { target: 'main' })), (r) =>
      merge(r, { revision: 'fitur' }),
    )
    const rebased = step(start, (r) => rebase(r, { upstream: 'main' }))

    // Merge: one new commit, two parents, both histories intact.
    const mergeTip = requireCommit(merged.store, merged.refs['refs/heads/main'])
    expect(mergeTip.parents).toHaveLength(2)
    expect(orphanedCommits(merged)).toEqual([])

    // Rebase: a linear chain, and the originals left behind.
    const rebaseTip = requireCommit(rebased.store, rebased.refs['refs/heads/fitur'])
    expect(rebaseTip.parents).toHaveLength(1)
    expect(orphanedCommits(rebased)).toHaveLength(2)
  })
})

describe('rebase copies commits, it does not move them', () => {
  it('gives every replayed commit a new id, and leaves the original in the store', () => {
    const start = diverged()
    const originals = [start.refs['refs/heads/fitur'], requireCommit(start.store, start.refs['refs/heads/fitur']).parents[0]]

    const objectsBefore = count(start.store)
    const rebased = step(start, (r) => rebase(r, { upstream: 'main' }))

    // Nothing was removed; the store only grew.
    expect(count(rebased.store)).toBeGreaterThan(objectsBefore)
    for (const oid of originals) {
      expect(rebased.store.objects[oid]).toBeDefined()
      expect(reachable(rebased).has(oid)).toBe(false)
    }

    const tip = rebased.refs['refs/heads/fitur']
    expect(originals).not.toContain(tip)
  })

  it('preserves the author and stamps a new committer, as git-rebase specifies', () => {
    const start = diverged()
    const originalTip = requireCommit(start.store, start.refs['refs/heads/fitur'])

    const rebased = step(start, (r) => rebase(r, { upstream: 'main' }))
    const newTip = requireCommit(rebased.store, rebased.refs['refs/heads/fitur'])

    expect(newTip.author).toEqual(originalTip.author)
    expect(newTip.committer.timestamp).toBeGreaterThan(originalTip.committer.timestamp)
    expect(newTip.message).toBe(originalTip.message)
    // Same content, different parent chain, therefore a different id.
    expect(newTip.tree).not.toBe(originalTip.tree)
    expect(newTip.oid).not.toBe(originalTip.oid)
  })

  it('changes the hash even when the tree is identical', () => {
    // A commit whose replay produces exactly the same tree still gets a new id,
    // because the parent — and the committer timestamp — are part of the hash.
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = step(repo, (r) => createBranch(r, 'fitur', undefined))
    repo = commitFile(repo, 'shared.txt', ['sama'], 'main menambah shared')
    repo = step(repo, (r) => checkout(r, { target: 'fitur' }))
    repo = commitFile(repo, 'shared.txt', ['sama'], 'fitur menambah shared yang sama')

    const before = requireCommit(repo.store, repo.refs['refs/heads/fitur'])
    const rebased = step(repo, (r) => rebase(r, { upstream: 'main' }))
    const after = requireCommit(rebased.store, rebased.refs['refs/heads/fitur'])

    expect(after.tree).toBe(before.tree)
    expect(after.oid).not.toBe(before.oid)
  })

  it('is recoverable: the original tip is still named by the reflog', () => {
    const start = diverged()
    const originalTip = start.refs['refs/heads/fitur']

    const rebased = step(start, (r) => rebase(r, { upstream: 'main' }))
    const named = rebased.reflog.some((entry) => entry.before === originalTip || entry.after === originalTip)

    expect(orphanedCommits(rebased)).toContain(originalTip)
    expect(named).toBe(true)
  })
})

describe('merge without a rewrite', () => {
  it('fast-forwards without creating a commit', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = step(repo, (r) => createBranch(r, 'fitur', undefined))
    repo = step(repo, (r) => checkout(r, { target: 'fitur' }))
    repo = commitFile(repo, 'b.txt', ['B'], 'B')
    repo = step(repo, (r) => checkout(r, { target: 'main' }))

    const objectsBefore = count(repo.store)
    const merged = step(repo, (r) => merge(r, { revision: 'fitur' }))

    expect(count(merged.store)).toBe(objectsBefore)
    expect(merged.refs['refs/heads/main']).toBe(merged.refs['refs/heads/fitur'])
  })

  it('reports already-up-to-date without touching anything', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = step(repo, (r) => createBranch(r, 'lama', undefined))
    repo = commitFile(repo, 'a.txt', ['B'], 'B')

    const merged = step(repo, (r) => merge(r, { revision: 'lama' }))
    expect(merged.refs).toEqual(repo.refs)
    expect(count(merged.store)).toBe(count(repo.store))
  })
})
