/**
 * The gitrevisions(7) expression table. New revision syntax gets an entry here
 * before it gets an implementation.
 *
 * The shape under test is a small history with a merge, because the expressions
 * people get wrong — `^2` against `~2` — only differ once there is a merge.
 *
 *   A ── B ── C ────── M   (main)
 *         \           /
 *          D ─────── E     (fitur)
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { createBranch } from '@/lib/git/commands/branch'
import { checkout } from '@/lib/git/commands/checkout'
import { GitError } from '@/lib/git/errors'
import { makeCommit } from '@/lib/git/objects'
import { put, requireCommit } from '@/lib/git/store'
import { revParse, revParseCommit } from '@/lib/git/revparse'
import { updateRef } from '@/lib/git/update-ref'
import type { Repository } from '@/lib/git/state'
import { commitFile, newRepo, step } from '../helpers/repo'

let repo: Repository
const oid: Record<string, string> = {}

beforeAll(() => {
  let r = commitFile(newRepo(), 'a.txt', ['A'], 'A')
  oid.A = r.refs['refs/heads/main']
  r = commitFile(r, 'a.txt', ['B'], 'B')
  oid.B = r.refs['refs/heads/main']

  r = step(r, (x) => createBranch(x, 'fitur', undefined))
  r = commitFile(r, 'a.txt', ['C'], 'C')
  oid.C = r.refs['refs/heads/main']

  r = step(r, (x) => checkout(x, { target: 'fitur' }))
  r = commitFile(r, 'b.txt', ['D'], 'D')
  oid.D = r.refs['refs/heads/fitur']
  r = commitFile(r, 'b.txt', ['E'], 'E')
  oid.E = r.refs['refs/heads/fitur']

  // The merge is built directly: `merge` lands in a later milestone, and this
  // table only needs the shape.
  const merge = makeCommit({
    tree: requireCommit(r.store, oid.C).tree,
    parents: [oid.C, oid.E],
    author: { name: 'Anda', email: 'anda@cangkok.local', timestamp: 1, timezone: '+0700' },
    committer: { name: 'Anda', email: 'anda@cangkok.local', timestamp: 1, timezone: '+0700' },
    message: 'M',
  })
  r = { ...r, store: put(r.store, merge) }
  oid.M = merge.oid
  r = step(r, (x) => checkout(x, { target: 'main' }))
  r = updateRef(r, 'refs/heads/main', merge.oid, 'merge', 'fitur ke main').repo
  r = updateRef(r, 'refs/tags/v1', oid.C, 'tag', 'v1').repo

  repo = r
})

describe('gitrevisions — resolution table', () => {
  const table: Array<[expression: string, expected: () => string]> = [
    ['HEAD', () => oid.M],
    ['@', () => oid.M],
    ['main', () => oid.M],
    ['refs/heads/main', () => oid.M],
    ['fitur', () => oid.E],
    ['v1', () => oid.C],

    // ^<n> is the n-th parent. ~<n> is the n-th ancestor along first parents.
    // On a merge commit they disagree, which is the whole point of the pair.
    ['HEAD^', () => oid.C],
    ['HEAD^1', () => oid.C],
    ['HEAD^2', () => oid.E],
    ['HEAD~1', () => oid.C],
    ['HEAD~2', () => oid.B],
    ['HEAD~3', () => oid.A],
    ['HEAD~', () => oid.C],
    ['HEAD~~', () => oid.B],
    ['HEAD^^', () => oid.B],

    // Mixed chains apply left to right.
    ['HEAD^2~1', () => oid.D],
    ['HEAD^2^', () => oid.D],
    ['HEAD~2^', () => oid.A],

    // ^0 names the commit itself.
    ['HEAD^0', () => oid.M],
    ['main^0', () => oid.M],

    // Peeling.
    ['HEAD^{}', () => oid.M],
    ['HEAD^{commit}', () => oid.M],
    ['v1^{commit}', () => oid.C],
  ]

  for (const [expression, expected] of table) {
    it(`resolves ${expression}`, () => {
      expect(revParse(repo, expression)).toBe(expected())
    })
  }

  it('resolves an unambiguous short oid', () => {
    expect(revParse(repo, oid.B.slice(0, 7))).toBe(oid.B)
    expect(revParse(repo, `${oid.B.slice(0, 7)}~1`)).toBe(oid.A)
  })

  it('resolves a tree through ^{tree}', () => {
    expect(revParse(repo, 'HEAD^{tree}')).toBe(requireCommit(repo.store, oid.M).tree)
  })

  it('prefers a tag over a branch of the same name, as gitrevisions specifies', () => {
    const shadowed = updateRef(repo, 'refs/tags/fitur', oid.A, 'tag', 'bayangan').repo
    expect(revParse(shadowed, 'fitur')).toBe(oid.A)
    expect(revParse(shadowed, 'refs/heads/fitur')).toBe(oid.E)
  })
})

describe('gitrevisions — reflog positions', () => {
  it('resolves HEAD@{0} to the current value', () => {
    expect(revParse(repo, 'HEAD@{0}')).toBe(oid.M)
  })

  it('resolves a branch reflog position', () => {
    expect(revParse(repo, 'main@{0}')).toBe(oid.M)
    expect(revParse(repo, 'main@{1}')).toBe(oid.C)
    expect(revParse(repo, 'main@{2}')).toBe(oid.B)
  })

  it('rejects a position beyond the end of the log, naming the length', () => {
    expect(() => revParse(repo, 'main@{99}')).toThrow(/has only \d+ entries/)
  })

  it('rejects date and upstream forms loudly rather than guessing', () => {
    expect(() => revParse(repo, 'HEAD@{yesterday}')).toThrow(/is not supported/)
    expect(() => revParse(repo, 'main@{upstream}')).toThrow(/is not supported/)
  })
})

describe('gitrevisions — failures name what went wrong', () => {
  it('rejects an unknown name', () => {
    expect(() => revParse(repo, 'tidakada')).toThrow(/unknown revision/)
  })

  it('rejects a parent index the commit does not have', () => {
    expect(() => revParse(repo, 'HEAD^3')).toThrow(/no parent number 3/)
    expect(() => revParse(repo, 'fitur^2')).toThrow(GitError)
  })

  it('rejects walking past the root commit', () => {
    expect(() => revParse(repo, 'HEAD~9')).toThrow(/past the root commit/)
  })

  it('rejects an oid prefix shorter than git would accept', () => {
    expect(() => revParse(repo, oid.B.slice(0, 3))).toThrow(/unknown revision/)
  })

  it('revParseCommit refuses something that is not a commit', () => {
    const tree = requireCommit(repo.store, oid.M).tree
    expect(() => revParseCommit(repo, tree)).toThrow(/does not point at a commit/)
  })
})
