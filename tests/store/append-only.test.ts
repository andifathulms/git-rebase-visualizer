import { describe, expect, it } from 'vitest'
import { EMPTY_TREE, makeBlob, makeCommit, makeTree, type Signature } from '@/lib/git/objects'
import { count, emptyStore, get, oids, put, putAll, sweep } from '@/lib/git/store'
import { GitError } from '@/lib/git/errors'
import { expectAppendOnly, snapshotStore } from '../helpers/store-invariants'

const sig: Signature = {
  name: 'Simulator',
  email: 'sim@example.test',
  timestamp: 1_700_000_000,
  timezone: '+0700',
}

describe('object store — append-only', () => {
  it('keeps every prior object byte-identical after a write', () => {
    const blob = makeBlob(['hello'])
    const tree = makeTree([{ name: 'a.txt', oid: blob.oid, kind: 'blob' }])
    let store = putAll(emptyStore, [blob, tree])

    const before = snapshotStore(store)
    store = put(store, makeCommit({ tree: tree.oid, parents: [], author: sig, committer: sig, message: 'awal' }))

    expectAppendOnly(before, store)
    expect(count(store)).toBe(3)
  })

  it('does not mutate the store it was given', () => {
    const blob = makeBlob(['hello'])
    const store = emptyStore
    const next = put(store, blob)

    expect(count(store)).toBe(0)
    expect(count(next)).toBe(1)
    expect(next).not.toBe(store)
  })

  it('treats a repeated write as a no-op, sharing the object', () => {
    const first = makeBlob(['sama'])
    const second = makeBlob(['sama'])
    expect(second.oid).toBe(first.oid)

    const store = put(emptyStore, first)
    const again = put(store, second)

    expect(again).toBe(store)
    expect(count(again)).toBe(1)
  })

  it('refuses an object whose recorded oid disagrees with its content', () => {
    const blob = makeBlob(['hello'])
    const forged = { ...blob, lines: ['diubah diam-diam'] }
    expect(() => put(emptyStore, forged)).toThrow(GitError)
  })

  it('removes only through sweep, and only what is not kept', () => {
    const kept = makeBlob(['simpan'])
    const dropped = makeBlob(['buang'])
    const store = putAll(emptyStore, [kept, dropped])

    const swept = sweep(store, new Set([kept.oid]))

    expect(get(swept, kept.oid)).toEqual(kept)
    expect(get(swept, dropped.oid)).toBeUndefined()
    // The pre-sweep store is untouched — sweep returns a new store.
    expect(count(store)).toBe(2)
  })
})

describe('object store — deterministic ordering', () => {
  it('lists oids sorted, regardless of insertion order', () => {
    const objects = ['a', 'b', 'c', 'd'].map((line) => makeBlob([line]))
    const forward = putAll(emptyStore, objects)
    const backward = putAll(emptyStore, [...objects].reverse())

    expect(oids(forward)).toEqual([...oids(forward)].sort())
    expect(oids(forward)).toEqual(oids(backward))
  })

  it('agrees with git on the empty tree id', () => {
    expect(EMPTY_TREE.oid).toBe('4b825dc642cb6eb9a060e54bf8d69288fbee4904')
  })
})
