/**
 * Structural agreement with real git.
 *
 * The fixtures in `fixtures.json` were produced by `pnpm fixtures:record`,
 * which runs the scenarios in `scenarios.mjs` through the actual git binary.
 * This test runs the identical scripts through the simulator and asserts the two
 * descriptions match.
 *
 * PRD §8 and CLAUDE.md invariant 11: never assert literal hash equality against
 * real git. Real git folds committer timestamp and author identity into a
 * commit id, so the ids differ by construction. What must agree is the shape —
 * parent relationships, ref positions, which commits share a tree, and whether
 * a rewritten commit survived as an unreferenced object.
 */
import { describe, expect, it } from 'vitest'
import { execute } from '@/lib/git/execute'
import { ancestors } from '@/lib/git/merge-base'
import { orphanedCommits, reachable } from '@/lib/git/reachable'
import { listRefs, shortRef } from '@/lib/git/refs'
import { requireCommit } from '@/lib/git/store'
import { emptyRepository, type Repository } from '@/lib/git/state'
import type { Oid } from '@/lib/hash'
import { expectAppendOnly, snapshotStore } from '../helpers/store-invariants'
import fixtures from './fixtures.json'
// @ts-expect-error — plain JS, shared verbatim with the recorder script.
import { SCENARIOS } from './scenarios.mjs'

interface Scenario {
  id: string
  lesson: string
  script: string[]
}

interface Description {
  refs: Record<string, string>
  remoteRefs: Record<string, string | null>
  head: string | null
  commits: Record<string, { parents: string[]; treeGroup: number }>
  marks: Record<string, { present: boolean; reachable: boolean }>
  reachableCount: number
}

function tokenize(line: string): string[] {
  return (line.match(/"[^"]*"|\S+/g) ?? []).map((token) => token.replace(/^"|"$/g, ''))
}

function runScenario(scenario: Scenario): { repo: Repository; marks: Record<string, Oid> } {
  let repo = emptyRepository()
  const marks: Record<string, Oid> = {}

  for (const raw of scenario.script) {
    const line = raw.replace(/@mark:([\w-]+)/g, (_, name: string) => {
      const oid = marks[name]
      if (!oid) throw new Error(`mark ${name} belum ada di ${scenario.id}`)
      return oid
    })
    const tokens = tokenize(line)

    if (tokens[0] === 'write') {
      repo = {
        ...repo,
        worktree: { ...repo.worktree, [tokens[1]]: tokens[2].split('|') },
      }
      continue
    }

    if (tokens[0] === 'remote-init') {
      // The simulator always has exactly one peer, so there is nothing to
      // create; the recorder makes a real bare repository for the same line.
      continue
    }

    if (tokens[0] === 'mark') {
      marks[tokens[1]] = repo.head.type === 'detached' ? repo.head.oid : repo.refs[repo.head.ref]
      continue
    }

    const before = snapshotStore(repo.store)
    repo = execute(repo, line).repo
    // The shared invariant, after every command, as the testing rules require.
    expectAppendOnly(before, repo.store)
  }

  return { repo, marks }
}

function describeRepo(repo: Repository, marks: Record<string, Oid>): Description {
  const live = reachable(repo)
  const reachableCommits = [...live].filter((oid) => repo.store.objects[oid].type === 'commit')

  const subject = (oid: Oid) => requireCommit(repo.store, oid).message.split('\n')[0]
  const parentsOf = (oid: Oid) => requireCommit(repo.store, oid).parents
  const ancestorCount = (oid: Oid) => ancestors(repo.store, oid).size

  // The same disambiguation the recorder applies: cherry-pick and rebase copy a
  // message onto a second commit, so duplicates are ordered by ancestor count,
  // then parent messages, then tree. The tree is a sort key only; it never
  // reaches the fixture.
  const labels: Record<Oid, string> = {}
  const groups: Record<string, Oid[]> = {}
  for (const oid of reachableCommits) {
    ;(groups[subject(oid)] ??= []).push(oid)
  }
  for (const message of Object.keys(groups).sort()) {
    const group = groups[message]
    if (group.length === 1) {
      labels[group[0]] = message
      continue
    }
    const ordered = [...group].sort((a, b) => {
      const byDepth = ancestorCount(a) - ancestorCount(b)
      if (byDepth !== 0) return byDepth
      const byParents = parentsOf(a)
        .map(subject)
        .join(',')
        .localeCompare(parentsOf(b).map(subject).join(','))
      if (byParents !== 0) return byParents
      return requireCommit(repo.store, a).tree.localeCompare(requireCommit(repo.store, b).tree)
    })
    ordered.forEach((oid, index) => {
      labels[oid] = `${message}#${index}`
    })
  }

  const treeGroups: Record<string, number> = {}
  let nextGroup = 0
  const groupFor = (tree: Oid) => {
    if (!(tree in treeGroups)) treeGroups[tree] = nextGroup++
    return treeGroups[tree]
  }

  const commits: Description['commits'] = {}
  for (const oid of [...reachableCommits].sort((a, b) => labels[a].localeCompare(labels[b]))) {
    const commit = requireCommit(repo.store, oid)
    commits[labels[oid]] = {
      parents: commit.parents.map((parent) => labels[parent]),
      treeGroup: groupFor(commit.tree),
    }
  }

  const refs: Record<string, string> = {}
  for (const ref of listRefs(repo.refs)) refs[ref] = labels[repo.refs[ref]]

  const remoteRefs: Record<string, string | null> = {}
  for (const ref of listRefs(repo.remote.refs)) {
    remoteRefs[ref] = labels[repo.remote.refs[ref]] ?? null
  }

  const markStates: Description['marks'] = {}
  for (const name of Object.keys(marks).sort()) {
    markStates[name] = {
      present: repo.store.objects[marks[name]] !== undefined,
      reachable: live.has(marks[name]),
    }
  }

  return {
    refs,
    remoteRefs,
    head: repo.head.type === 'attached' ? shortRef(repo.head.ref) : null,
    commits,
    marks: markStates,
    reachableCount: reachableCommits.length,
  }
}

const recorded = fixtures as unknown as Record<string, Description>

describe('oracle — structural agreement with real git', () => {
  for (const scenario of SCENARIOS as Scenario[]) {
    it(`matches git for ${scenario.id}`, () => {
      const { repo, marks } = runScenario(scenario)
      const fixture = recorded[scenario.id]

      expect(fixture, `fixture untuk ${scenario.id} belum direkam`).toBeDefined()
      expect(describeRepo(repo, marks)).toEqual(fixture)
    })
  }

  it('covers every recorded fixture', () => {
    expect((SCENARIOS as Scenario[]).map((scenario) => scenario.id).sort()).toEqual(
      Object.keys(recorded).sort(),
    )
  })
})

describe('oracle — the claims the fixtures encode', () => {
  it('confirms with real git that rebase leaves the original behind', () => {
    // Not the simulator's opinion: this is what the recorded git run reported.
    expect(recorded['feature-behind-main'].marks['sebelum-rebase']).toEqual({
      present: true,
      reachable: false,
    })

    const { repo, marks } = runScenario(
      (SCENARIOS as Scenario[]).find((s) => s.id === 'feature-behind-main')!,
    )
    expect(orphanedCommits(repo)).toContain(marks['sebelum-rebase'])
  })

  it('confirms with real git that a hard reset removes no object', () => {
    expect(recorded['accidental-hard-reset'].marks['yang-hilang'].present).toBe(true)
  })

  it('confirms with real git that a force-push abandons the old commit on the peer', () => {
    const fixture = recorded['force-push-drops-a-commit']
    // Real git's own bare repository reported this: the object is still there,
    // and nothing on either side names it any more.
    expect(fixture.marks['yang-ditinggalkan']).toEqual({ present: true, reachable: false })
    expect(fixture.remoteRefs['refs/heads/main']).toBe('B rapi')
  })

  it('confirms with real git that a fast-forward push adds no commit', () => {
    const fixture = recorded['push-fast-forward']
    expect(fixture.remoteRefs['refs/heads/main']).toBe('B')
    expect(fixture.reachableCount).toBe(2)
  })

  it('confirms with real git that fast-forward adds no commit', () => {
    expect(recorded['fast-forward'].reachableCount).toBe(2)
    expect(recorded['fast-forward'].refs['refs/heads/main']).toBe(
      recorded['fast-forward'].refs['refs/heads/fitur'],
    )
  })
})
