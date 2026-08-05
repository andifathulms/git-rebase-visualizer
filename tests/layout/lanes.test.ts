/**
 * Layout snapshots. PRD §13 says to build the crossing-heavy case first, not
 * last, so the merge and the post-rebase orphan shapes are here from the start.
 * Snapshot diffs are read by eye and never accepted blind.
 */
import { describe, expect, it } from 'vitest'
import { createBranch } from '@/lib/git/commands/branch'
import { checkout } from '@/lib/git/commands/checkout'
import { merge } from '@/lib/git/commands/merge'
import { rebase } from '@/lib/git/commands/rebase'
import { layoutGraph } from '@/lib/layout/lanes'
import { allCommits } from '@/lib/git/query'
import { reachable } from '@/lib/git/reachable'
import type { Repository } from '@/lib/git/state'
import { commitFile, newRepo, step } from '../helpers/repo'

function render(repo: Repository): string {
  const layout = layoutGraph(allCommits(repo), reachable(repo))
  const width = layout.lanes
  const subject = (oid: string) =>
    allCommits(repo).find((commit) => commit.oid === oid)?.message.split('\n')[0] ?? '?'

  return layout.nodes
    .map((node) => {
      const track = Array.from({ length: width }, (_, lane) =>
        lane === node.lane ? (node.reachable ? '●' : '○') : '·',
      ).join('')
      return `${track}  ${subject(node.oid)}`
    })
    .join('\n')
}

function diverged(): Repository {
  let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
  repo = step(repo, (r) => createBranch(r, 'fitur', undefined))
  repo = commitFile(repo, 'main.txt', ['B'], 'B')
  repo = step(repo, (r) => checkout(r, { target: 'fitur' }))
  repo = commitFile(repo, 'fitur.txt', ['C'], 'C')
  repo = commitFile(repo, 'fitur.txt', ['C', 'D'], 'D')
  return repo
}

describe('lane layout', () => {
  it('keeps a linear history in one lane', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = commitFile(repo, 'a.txt', ['B'], 'B')
    repo = commitFile(repo, 'a.txt', ['C'], 'C')

    expect(render(repo)).toMatchInlineSnapshot(`
      "●  C
      ●  B
      ●  A"
    `)
  })

  it('splits a diverged history into two lanes', () => {
    expect(render(diverged())).toMatchInlineSnapshot(`
      "●·  D
      ●·  C
      ·●  B
      ●·  A"
    `)
  })

  it('brings the lanes back together at a merge', () => {
    let repo = step(diverged(), (r) => checkout(r, { target: 'main' }))
    repo = step(repo, (r) => merge(r, { revision: 'fitur' }))

    expect(render(repo)).toMatchInlineSnapshot(`
      "●·  Merge fitur into main
      ·●  D
      ·●  C
      ●·  B
      ●·  A"
    `)
  })

  it('gives the orphans left by a rebase their own lane, still drawn', () => {
    const repo = step(diverged(), (r) => rebase(r, { upstream: 'main' }))

    // The two hollow marks are the originals: present, unreferenced, and
    // deliberately still on the board.
    expect(render(repo)).toMatchInlineSnapshot(`
      "●·  D
      ●·  C
      ·○  D
      ·○  C
      ●·  B
      ●·  A"
    `)
  })

  it('is deterministic', () => {
    const repo = diverged()
    expect(layoutGraph(allCommits(repo), reachable(repo))).toEqual(
      layoutGraph(allCommits(repo), reachable(repo)),
    )
  })
})
