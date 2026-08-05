import { describe, expect, it } from 'vitest'
import {
  blobContent,
  makeBlob,
  makeCommit,
  makeTree,
  sortTreeEntries,
  type Signature,
} from '@/lib/git/objects'

const sig: Signature = {
  name: 'Cangkok',
  email: 'cangkok@example.test',
  timestamp: 1_700_000_000,
  timezone: '+0700',
}

const commit = (over: Partial<Parameters<typeof makeCommit>[0]> = {}) =>
  makeCommit({
    tree: '4b825dc642cb6eb9a060e54bf8d69288fbee4904',
    parents: [],
    author: sig,
    committer: sig,
    message: 'awal',
    ...over,
  })

describe('content addressing — identical content, identical hash', () => {
  it('deduplicates blobs', () => {
    expect(makeBlob(['a', 'b']).oid).toBe(makeBlob(['a', 'b']).oid)
  })

  it('deduplicates trees regardless of the order entries were supplied in', () => {
    const x = makeBlob(['x']).oid
    const y = makeBlob(['y']).oid
    const forward = makeTree([
      { name: 'x.txt', oid: x, kind: 'blob' },
      { name: 'y.txt', oid: y, kind: 'blob' },
    ])
    const backward = makeTree([
      { name: 'y.txt', oid: y, kind: 'blob' },
      { name: 'x.txt', oid: x, kind: 'blob' },
    ])
    expect(backward.oid).toBe(forward.oid)
  })

  it('deduplicates commits', () => {
    expect(commit().oid).toBe(commit().oid)
  })
})

describe('content addressing — any change, different hash', () => {
  it('reacts to blob content', () => {
    expect(makeBlob(['a']).oid).not.toBe(makeBlob(['b']).oid)
    expect(makeBlob([]).oid).not.toBe(makeBlob(['']).oid)
  })

  it('reacts to a tree entry name, target, or kind', () => {
    const oid = makeBlob(['x']).oid
    const base = makeTree([{ name: 'a', oid, kind: 'blob' }])
    expect(makeTree([{ name: 'b', oid, kind: 'blob' }]).oid).not.toBe(base.oid)
    expect(makeTree([{ name: 'a', oid: makeBlob(['z']).oid, kind: 'blob' }]).oid).not.toBe(base.oid)
    expect(makeTree([{ name: 'a', oid, kind: 'tree' }]).oid).not.toBe(base.oid)
  })

  it('reacts to the parent — this is why rebase creates new commits', () => {
    const root = commit()
    const child = commit({ parents: [root.oid], message: 'kedua' })
    const regrafted = commit({ parents: [makeBlob(['lain']).oid], message: 'kedua' })

    expect(regrafted.oid).not.toBe(child.oid)
    // Everything else about the two commits is equal — only the parent moved.
    expect(regrafted.tree).toBe(child.tree)
    expect(regrafted.message).toBe(child.message)
  })

  it('reacts to tree, message, author, committer, and timestamp', () => {
    const base = commit()
    const other = makeBlob(['t']).oid
    expect(commit({ tree: other }).oid).not.toBe(base.oid)
    expect(commit({ message: 'lain' }).oid).not.toBe(base.oid)
    expect(commit({ author: { ...sig, name: 'Lain' } }).oid).not.toBe(base.oid)
    expect(commit({ committer: { ...sig, timestamp: sig.timestamp + 1 } }).oid).not.toBe(base.oid)
  })

  it('separates author from committer, as git does', () => {
    const authored = commit({ author: { ...sig, name: 'A' } })
    const committed = commit({ committer: { ...sig, name: 'A' } })
    expect(authored.oid).not.toBe(committed.oid)
  })
})

describe('canonical serialization — agreement with real git', () => {
  // Recorded from `git ls-tree` on a repository holding these exact files.
  it('matches git for blobs', () => {
    expect(makeBlob(['hello']).oid).toBe('ce013625030ba8dba906f756967f9e9ca394464a')
    expect(makeBlob(['satu', 'dua']).oid).not.toBe(makeBlob(['hello']).oid)
    expect(makeBlob(['z']).oid).toBe('b68025345d5301abad4d9ec9166f455243a0d746')
  })

  it('matches git for a nested tree', () => {
    const dir = makeTree([
      { name: 'b.txt', oid: makeBlob(['satu', 'dua']).oid, kind: 'blob' },
    ])
    const foo = makeTree([{ name: 'inner.txt', oid: makeBlob(['y']).oid, kind: 'blob' }])
    expect(dir.oid).toBe('086cc6e861edacd49df43f19138067e812f26896')
    expect(foo.oid).toBe('88788cf0e8a0d18bd97c61270f90b6e9d83a037d')

    const root = makeTree([
      { name: 'a.txt', oid: makeBlob(['hello']).oid, kind: 'blob' },
      { name: 'dir', oid: dir.oid, kind: 'tree' },
      { name: 'foo.txt', oid: makeBlob(['z']).oid, kind: 'blob' },
      { name: 'foo', oid: foo.oid, kind: 'tree' },
    ])
    expect(root.oid).toBe('e2533628c9525910e871cb08d6f62dabcc9b656f')
  })

  it('sorts a subtree as though its name ended in a slash', () => {
    const oid = makeBlob(['x']).oid
    const sorted = sortTreeEntries([
      { name: 'foo', oid, kind: 'tree' },
      { name: 'foo.txt', oid, kind: 'blob' },
    ])
    expect(sorted.map((entry) => entry.name)).toEqual(['foo.txt', 'foo'])
  })

  it('newline-terminates every line, so an empty file is empty bytes', () => {
    expect(blobContent(makeBlob(['a', 'b']))).toBe('a\nb\n')
    expect(blobContent(makeBlob([]))).toBe('')
  })
})
