/**
 * Every curated scenario must actually run, and must leave the repository in
 * the state its lesson describes. A scenario that throws would be a broken
 * front door.
 */
import { describe, expect, it } from 'vitest'
import { SCENARIOS } from '@/data/scenarios'
import { runLine } from '@/lib/git/session'
import { orphanedCommits } from '@/lib/git/reachable'
import { revParse } from '@/lib/git/revparse'
import { emptyRepository, type Repository } from '@/lib/git/state'
import { count } from '@/lib/git/store'
import { expectAppendOnly, snapshotStore } from '../helpers/store-invariants'

function play(script: readonly string[]): Repository {
  let repo = emptyRepository()
  for (const line of script) {
    const before = snapshotStore(repo.store)
    repo = runLine(repo, line).repo
    expectAppendOnly(before, repo.store)
  }
  return repo
}

describe('scenario library', () => {
  it('has stable, unique, url-safe ids', () => {
    const ids = SCENARIOS.map((scenario) => scenario.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/)
  })

  for (const scenario of SCENARIOS) {
    it(`plays ${scenario.id} without error`, () => {
      const repo = play(scenario.script)
      expect(count(repo.store)).toBeGreaterThan(0)
    })
  }

  it('feature-behind-main leaves fitur behind main, ready to rebase', () => {
    const repo = play(SCENARIOS.find((s) => s.id === 'feature-behind-main')!.script)
    expect(repo.head).toEqual({ type: 'attached', ref: 'refs/heads/fitur' })
    // Diverged: neither tip is an ancestor of the other.
    expect(revParse(repo, 'fitur~2')).toBe(revParse(repo, 'main~1'))
    expect(orphanedCommits(repo)).toEqual([])
  })

  it('accidental-hard-reset really does strand a commit that is still there', () => {
    const repo = play(SCENARIOS.find((s) => s.id === 'accidental-hard-reset')!.script)
    const stranded = orphanedCommits(repo)
    expect(stranded).toHaveLength(1)
    expect(repo.store.objects[stranded[0]]).toBeDefined()
    expect(revParse(repo, 'HEAD@{1}')).toBe(stranded[0])
  })

  it('conflicting-rebase is genuinely set up to conflict', () => {
    const repo = play(SCENARIOS.find((s) => s.id === 'conflicting-rebase')!.script)
    const after = runLine(repo, 'rebase main')
    expect(after.repo.pending?.type).toBe('rebase')
    expect(after.repo.pending?.conflicts).toEqual(['konfig.txt'])
    // Stopped without moving anything into the store.
    expect(count(after.repo.store)).toBe(count(repo.store))
  })

  it('published-branch can be undone safely with revert', () => {
    const repo = play(SCENARIOS.find((s) => s.id === 'published-branch')!.script)
    const after = runLine(repo, 'revert HEAD~1')
    expect(orphanedCommits(after.repo)).toEqual([])
  })
})
