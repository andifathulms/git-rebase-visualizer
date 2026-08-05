/**
 * PRD §8: "Same starting state and same command sequence produce a
 * byte-identical store, refs, and reflog." If this ever fails, something in the
 * engine is reading a clock, a random source, or an unordered collection.
 */
import { describe, expect, it } from 'vitest'
import { execute } from '@/lib/git/execute'
import { storeDigest } from '@/lib/git/store'
import { emptyRepository, type Repository } from '@/lib/git/state'
import { expectAppendOnly, snapshotStore } from '../helpers/store-invariants'

const SCRIPT = [
  'commit -m "A" --allow-empty',
  'branch fitur',
  'commit -m "B" --allow-empty',
  'checkout fitur',
  'commit -m "C" --allow-empty',
  'commit -m "D" --allow-empty',
  'rebase main',
  'checkout main',
  'merge fitur',
  'tag -a v1 -m "rilis"',
  'reset --hard HEAD~1',
  'reset --hard HEAD@{1}',
]

function run(script: readonly string[]): Repository {
  let repo = emptyRepository()
  for (const line of script) {
    const before = snapshotStore(repo.store)
    repo = execute(repo, line).repo
    expectAppendOnly(before, repo.store)
  }
  return repo
}

function fingerprint(repo: Repository): string {
  return [
    storeDigest(repo.store),
    JSON.stringify(repo.refs, Object.keys(repo.refs).sort()),
    JSON.stringify(repo.head),
    repo.reflog.map((entry) => `${entry.ref} ${entry.before} ${entry.after} ${entry.operation}`).join('\n'),
    String(repo.clock),
  ].join('\n---\n')
}

describe('determinism', () => {
  it('produces a byte-identical repository from the same script', () => {
    expect(fingerprint(run(SCRIPT))).toBe(fingerprint(run(SCRIPT)))
  })

  it('produces identical object ids across runs', () => {
    const a = run(SCRIPT)
    const b = run(SCRIPT)
    expect(Object.keys(a.store.objects).sort()).toEqual(Object.keys(b.store.objects).sort())
  })

  it('reaches a different fingerprint from a different script', () => {
    const other = run(SCRIPT.slice(0, -1))
    expect(fingerprint(other)).not.toBe(fingerprint(run(SCRIPT)))
  })

  it('advances only the virtual clock, never a real one', () => {
    const repo = run(SCRIPT)
    // EPOCH plus one step per object-creating operation; the exact number does
    // not matter, only that it is a function of the script and nothing else.
    expect(repo.clock).toBe(run(SCRIPT).clock)
    expect(Number.isInteger(repo.clock)).toBe(true)
  })
})
