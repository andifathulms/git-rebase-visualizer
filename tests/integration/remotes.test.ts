/**
 * PRD §6.7 — remotes and force-push. The most consequential git lesson there
 * is, and it only works because the object model is honest about what survives.
 */
import { describe, expect, it } from 'vitest'
import { collaboratorView, fetch, push } from '@/lib/git/commands/remote'
import { createBranch } from '@/lib/git/commands/branch'
import { checkout } from '@/lib/git/commands/checkout'
import { merge } from '@/lib/git/commands/merge'
import { rebase } from '@/lib/git/commands/rebase'
import { reset } from '@/lib/git/commands/reset'
import { execute } from '@/lib/git/execute'
import { orphanedCommits, reachable, remoteReachable } from '@/lib/git/reachable'
import { revParse } from '@/lib/git/revparse'
import { count } from '@/lib/git/store'
import type { Repository } from '@/lib/git/state'
import { commitFile, newRepo, step } from '../helpers/repo'

/** A repository whose main has been pushed to origin. */
function published(): Repository {
  let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
  repo = commitFile(repo, 'a.txt', ['A', 'B'], 'B')
  return step(repo, (r) => push(r, {}))
}

describe('push', () => {
  it('moves a ref on the peer and the tracking ref here, creating no object', () => {
    const repo = commitFile(commitFile(newRepo(), 'a.txt', ['A'], 'A'), 'a.txt', ['A', 'B'], 'B')
    const before = count(repo.store)
    const after = step(repo, (r) => push(r, {}))

    expect(count(after.store)).toBe(before)
    expect(after.remote.refs['refs/heads/main']).toBe(after.refs['refs/heads/main'])
    expect(after.refs['refs/remotes/origin/main']).toBe(after.refs['refs/heads/main'])
  })

  it('writes a reflog entry for the tracking ref, like any other movement', () => {
    const after = published()
    expect(
      after.reflog.some((entry) => entry.ref === 'refs/remotes/origin/main' && entry.operation === 'push'),
    ).toBe(true)
  })

  it('reports already-up-to-date without moving anything', () => {
    const repo = published()
    const again = step(repo, (r) => push(r, {}))
    expect(again.reflog).toEqual(repo.reflog)
  })

  it('fast-forwards a peer that is behind', () => {
    let repo = published()
    repo = commitFile(repo, 'a.txt', ['A', 'B', 'C'], 'C')
    const after = step(repo, (r) => push(r, {}))
    expect(after.remote.refs['refs/heads/main']).toBe(revParse(after, 'HEAD'))
    expect(orphanedCommits(after)).toEqual([])
  })

  it('refuses a non-fast-forward push and names what would be lost', () => {
    let repo = published()
    const published_B = revParse(repo, 'HEAD')

    // Rewrite history under the peer's feet.
    repo = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'hard' }))
    repo = commitFile(repo, 'a.txt', ['A', 'B lain'], 'B lain')

    expect(() => push(repo, {})).toThrow(/push rejected/)
    expect(() => push(repo, {})).toThrow(published_B.slice(0, 7))
  })

  it('refuses to push from a detached HEAD rather than guessing a branch', () => {
    const repo = step(published(), (r) => checkout(r, { target: 'HEAD~1', detach: true }))
    expect(() => push(repo, {})).toThrow(/HEAD is detached/)
  })

  it('names an unknown remote instead of inventing one', () => {
    expect(() => push(published(), { remote: 'upstream' })).toThrow(/does not exist/)
  })
})

describe('force-push — what the collaborator loses', () => {
  it('strands the peer’s old commits without removing a single object', () => {
    let repo = published()
    const abandoned = revParse(repo, 'HEAD')
    const objectsBefore = count(repo.store)

    repo = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'hard' }))
    repo = commitFile(repo, 'a.txt', ['A', 'B ditulis ulang'], 'B ditulis ulang')
    const forced = step(repo, (r) => push(r, { force: true }))

    // Nothing was deleted; the peer simply stopped naming it. The store grew by
    // exactly the blob, tree, and commit of the rewritten commit.
    expect(count(forced.store)).toBe(objectsBefore + 3)
    expect(forced.store.objects[abandoned]).toBeDefined()
    expect(remoteReachable(forced).has(abandoned)).toBe(false)
    expect(forced.remote.refs['refs/heads/main']).toBe(revParse(forced, 'HEAD'))
  })

  it('reports the abandoned commits as destructive, naming them', () => {
    let repo = published()
    const abandoned = revParse(repo, 'HEAD')
    repo = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'hard' }))
    repo = commitFile(repo, 'a.txt', ['A', 'lain'], 'lain')

    const result = push(repo, { force: true })
    const destructive = result.events.find(
      (event) => event.type === 'message' && event.tone === 'destructive',
    )
    expect(destructive).toBeDefined()
    expect(destructive && destructive.type === 'message' && destructive.text.en).toContain(
      abandoned.slice(0, 7),
    )
  })

  it('leaves a collaborator’s view missing exactly those commits', () => {
    let repo = published()
    const abandoned = revParse(repo, 'HEAD')
    repo = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'hard' }))
    repo = commitFile(repo, 'a.txt', ['A', 'lain'], 'lain')
    const forced = step(repo, (r) => push(r, { force: true }))

    const view = collaboratorView(forced)
    expect(view.commits).not.toContain(abandoned)
    expect(view.commits).toContain(revParse(forced, 'HEAD'))
    // A fresh clone gets two commits, not three.
    expect(view.commits).toHaveLength(2)
  })

  it('keeps a branch alive on the peer when another ref still holds it', () => {
    let repo = published()
    const shared = revParse(repo, 'HEAD')
    repo = step(repo, (r) => createBranch(r, 'arsip', undefined))
    repo = step(repo, (r) => push(r, { branch: 'arsip' }))

    repo = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'hard' }))
    repo = commitFile(repo, 'a.txt', ['A', 'lain'], 'lain')
    const forced = step(repo, (r) => push(r, { force: true }))

    // origin/arsip still names it, so nothing was stranded on the peer.
    expect(remoteReachable(forced).has(shared)).toBe(true)
    const destructive = push(repo, { force: true }).events.filter(
      (event) => event.type === 'message' && event.tone === 'destructive',
    )
    expect(destructive).toHaveLength(0)
  })
})

describe('fetch', () => {
  it('moves only the tracking ref, never a local branch', () => {
    const repo = published()

    // A second clone's worth of work, simulated by moving the peer directly.
    const ahead = commitFile(repo, 'a.txt', ['A', 'B', 'C dari rekan'], 'C dari rekan')
    const peerMoved: Repository = {
      ...repo,
      store: ahead.store,
      remote: { ...repo.remote, refs: { 'refs/heads/main': ahead.refs['refs/heads/main'] } },
    }

    const fetched = step(peerMoved, (r) => fetch(r))
    expect(fetched.refs['refs/remotes/origin/main']).toBe(ahead.refs['refs/heads/main'])
    // The local branch has not moved.
    expect(fetched.refs['refs/heads/main']).toBe(repo.refs['refs/heads/main'])
  })

  it('reports nothing new when the peer has not moved', () => {
    const repo = step(published(), (r) => fetch(r))
    const again = fetch(repo)
    expect(
      again.events.some((event) => event.type === 'message' && /Nothing new/.test(event.text.en)),
    ).toBe(true)
  })
})

describe('the peer keeps objects alive', () => {
  it('does not call a pushed commit an orphan after the local branch is reset', () => {
    let repo = published()
    const pushed = revParse(repo, 'HEAD')
    repo = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'hard' }))

    // Locally unreferenced, but origin still has it — so it is not an orphan.
    expect(reachable(repo).has(pushed)).toBe(true)
    expect(orphanedCommits(repo)).toEqual([])
  })
})

describe('the safe alternative', () => {
  it('fetch then merge integrates without a force-push', () => {
    const base = published()

    const ahead = commitFile(base, 'rekan.txt', ['dari rekan'], 'dari rekan')
    let repo: Repository = {
      ...base,
      store: ahead.store,
      remote: { ...base.remote, refs: { 'refs/heads/main': ahead.refs['refs/heads/main'] } },
    }
    repo = commitFile(repo, 'saya.txt', ['punya saya'], 'punya saya')

    repo = step(repo, (r) => fetch(r))
    repo = step(repo, (r) => merge(r, { revision: 'origin/main' }))
    const after = step(repo, (r) => push(r, {}))

    expect(after.remote.refs['refs/heads/main']).toBe(revParse(after, 'HEAD'))
    // Nothing on the peer was abandoned.
    expect(orphanedCommits(after)).toEqual([])
  })

  it('rebase onto origin/main also works, and is the case that needs --force', () => {
    const base = published()
    const ahead = commitFile(base, 'rekan.txt', ['dari rekan'], 'dari rekan')
    let repo: Repository = {
      ...base,
      store: ahead.store,
      remote: { ...base.remote, refs: { 'refs/heads/main': ahead.refs['refs/heads/main'] } },
    }
    repo = commitFile(repo, 'saya.txt', ['punya saya'], 'punya saya')

    repo = step(repo, (r) => fetch(r))
    repo = step(repo, (r) => rebase(r, { upstream: 'origin/main' }))

    // Rebasing onto the fetched tip is a fast-forward for the peer, so no force
    // is needed — the rewrite happened only to commits the peer never had.
    const after = step(repo, (r) => push(r, {}))
    expect(after.remote.refs['refs/heads/main']).toBe(revParse(after, 'HEAD'))
  })
})

describe('dispatcher', () => {
  it('routes push, fetch, and remote', () => {
    const repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    const pushed = execute(repo, 'push origin main').repo
    expect(pushed.remote.refs['refs/heads/main']).toBe(revParse(repo, 'HEAD'))
    expect(execute(pushed, 'fetch').repo).toBeDefined()
    expect(execute(pushed, 'remote').events[0]).toMatchObject({ type: 'message' })
  })

  it('refuses pull by name, pointing at fetch and merge', () => {
    expect(() => execute(newRepo(), 'pull')).toThrow(/fetch/)
  })

  it('accepts push --force', () => {
    let repo = published()
    repo = step(repo, (r) => reset(r, { revision: 'HEAD~1', mode: 'hard' }))
    repo = commitFile(repo, 'a.txt', ['A', 'lain'], 'lain')
    expect(() => execute(repo, 'push origin main --force')).not.toThrow()
    expect(() => execute(repo, 'push origin main')).toThrow(/push rejected/)
  })
})
