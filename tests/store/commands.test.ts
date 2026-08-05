import { describe, expect, it } from 'vitest'
import { add } from '@/lib/git/commands/add'
import { createBranch, deleteBranch } from '@/lib/git/commands/branch'
import { checkout } from '@/lib/git/commands/checkout'
import { commit } from '@/lib/git/commands/commit'
import { GitError } from '@/lib/git/errors'
import { orphanedCommits, reachable } from '@/lib/git/reachable'
import { HEAD_LOG, entriesFor } from '@/lib/git/reflog'
import { resolveHead } from '@/lib/git/refs'
import { revParse } from '@/lib/git/revparse'
import { count, requireCommit } from '@/lib/git/store'
import { readTree } from '@/lib/git/tree'
import { commitFile, edit, newRepo, step } from '../helpers/repo'

describe('commit', () => {
  it('creates objects and moves a ref, never the other way round', () => {
    const repo = commitFile(newRepo(), 'a.txt', ['satu'], 'tambah a')
    const head = resolveHead(repo.refs, repo.head)

    expect(head).toBeDefined()
    expect(repo.refs['refs/heads/main']).toBe(head)
    expect(requireCommit(repo.store, head!).parents).toEqual([])
    // blob + tree + commit
    expect(count(repo.store)).toBe(3)
  })

  it('reuses an unchanged subtree across commits', () => {
    let repo = commitFile(newRepo(), 'dir/a.txt', ['tetap'], 'awal')
    const firstTree = requireCommit(repo.store, revParse(repo, 'HEAD')).tree
    repo = commitFile(repo, 'b.txt', ['baru'], 'kedua')

    const secondTree = requireCommit(repo.store, revParse(repo, 'HEAD')).tree
    expect(secondTree).not.toBe(firstTree)
    // `dir` was untouched, so it re-hashes to the same oid and is shared.
    const dirEntry = readTree(repo.store, secondTree)
    expect(dirEntry['dir/a.txt']).toEqual(['tetap'])
  })

  it('refuses an empty commit unless asked', () => {
    const repo = commitFile(newRepo(), 'a.txt', ['satu'], 'awal')
    expect(() => commit(repo, { message: 'lagi' })).toThrow(GitError)
    expect(() => commit(repo, { message: 'lagi', allowEmpty: true })).not.toThrow()
  })

  it('writes a reflog entry for the branch and for HEAD', () => {
    const repo = commitFile(newRepo(), 'a.txt', ['satu'], 'awal')
    expect(entriesFor(repo.reflog, 'refs/heads/main')).toHaveLength(1)
    expect(entriesFor(repo.reflog, HEAD_LOG)).toHaveLength(1)
  })

  it('only commits what is staged', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['satu'], 'awal')
    repo = edit(repo, 'a.txt', ['diubah'])
    repo = edit(repo, 'b.txt', ['belum di-stage'])
    repo = step(repo, (r) => add(r, ['a.txt']))
    repo = step(repo, (r) => commit(r, { message: 'hanya a' }))

    const files = readTree(repo.store, requireCommit(repo.store, revParse(repo, 'HEAD')).tree)
    expect(files['a.txt']).toEqual(['diubah'])
    expect(files['b.txt']).toBeUndefined()
  })
})

describe('branch and checkout', () => {
  it('creates a branch without creating an object', () => {
    const repo = commitFile(newRepo(), 'a.txt', ['satu'], 'awal')
    const objectsBefore = count(repo.store)
    const next = step(repo, (r) => createBranch(r, 'fitur', undefined))

    expect(count(next.store)).toBe(objectsBefore)
    expect(next.refs['refs/heads/fitur']).toBe(next.refs['refs/heads/main'])
  })

  it('attaches HEAD to the branch card, not to the commit', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['satu'], 'awal')
    repo = step(repo, (r) => createBranch(r, 'fitur', undefined))
    repo = step(repo, (r) => checkout(r, { target: 'fitur' }))

    expect(repo.head).toEqual({ type: 'attached', ref: 'refs/heads/fitur' })

    repo = commitFile(repo, 'b.txt', ['dua'], 'di fitur')
    // main did not move; only the card HEAD is pinned to did.
    expect(repo.refs['refs/heads/fitur']).not.toBe(repo.refs['refs/heads/main'])
  })

  it('detaches HEAD and strands a commit that no card follows', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['satu'], 'awal')
    repo = commitFile(repo, 'a.txt', ['dua'], 'kedua')

    repo = step(repo, (r) => checkout(r, { target: 'HEAD~1', detach: true }))
    expect(repo.head.type).toBe('detached')

    repo = commitFile(repo, 'c.txt', ['yatim'], 'di detached HEAD')
    const stranded = resolveHead(repo.refs, repo.head)!

    repo = step(repo, (r) => checkout(r, { target: 'main' }))
    expect(orphanedCommits(repo)).toContain(stranded)
    // Still recoverable: the reflog names it.
    expect(revParse(repo, 'HEAD@{1}')).toBe(stranded)
  })

  it('refuses a checkout that would overwrite a local change', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['satu'], 'awal')
    repo = step(repo, (r) => createBranch(r, 'fitur', undefined))
    repo = step(repo, (r) => checkout(r, { target: 'fitur' }))
    repo = commitFile(repo, 'a.txt', ['versi fitur'], 'ubah a')
    repo = edit(repo, 'a.txt', ['belum di-commit'])

    expect(() => checkout(repo, { target: 'main' })).toThrow(/perubahan lokal/)
  })

  it('carries across a local change to a file the switch does not touch', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['satu'], 'awal')
    repo = step(repo, (r) => createBranch(r, 'fitur', undefined))
    repo = step(repo, (r) => checkout(r, { target: 'fitur' }))
    repo = commitFile(repo, 'b.txt', ['hanya di fitur'], 'tambah b')
    repo = edit(repo, 'a.txt', ['coretan'])

    const next = step(repo, (r) => checkout(r, { target: 'main' }))
    expect(next.worktree['a.txt']).toEqual(['coretan'])
    expect(next.worktree['b.txt']).toBeUndefined()
  })

  it('deleting a branch removes a card, not the boxes', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['satu'], 'awal')
    repo = step(repo, (r) => createBranch(r, 'buangan', undefined))
    repo = commitFile(repo, 'a.txt', ['dua'], 'kedua')

    const objectsBefore = count(repo.store)
    const next = step(repo, (r) => deleteBranch(r, 'buangan'))

    expect(count(next.store)).toBe(objectsBefore)
    expect(next.refs['refs/heads/buangan']).toBeUndefined()
  })

  it('refuses to delete the checked-out branch', () => {
    const repo = commitFile(newRepo(), 'a.txt', ['satu'], 'awal')
    expect(() => deleteBranch(repo, 'main')).toThrow(GitError)
  })
})

describe('reachability', () => {
  it('is recomputed from refs, so a moved card changes the answer', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['satu'], 'awal')
    const first = resolveHead(repo.refs, repo.head)!
    repo = commitFile(repo, 'a.txt', ['dua'], 'kedua')

    expect(reachable(repo).has(first)).toBe(true)

    // Point main back at the first commit; the second becomes an orphan.
    const second = resolveHead(repo.refs, repo.head)!
    const moved = { ...repo, refs: { ...repo.refs, 'refs/heads/main': first } }
    expect(reachable(moved).has(second)).toBe(false)
    expect(orphanedCommits(moved)).toContain(second)
  })
})
