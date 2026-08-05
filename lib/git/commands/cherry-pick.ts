/**
 * git-cherry-pick(1): "Given one or more existing commits, apply the change
 * each one introduces, recording a new commit for each."
 *
 * A new commit for each — same words, same consequence as rebase. The source
 * commit is untouched and keeps its id; the copy is a different object with a
 * different id, and both exist afterwards. Comparison mode puts cherry-pick
 * beside rebase for exactly that reason.
 */
import type { Oid } from '@/lib/hash'
import { GitError } from '../errors'
import { hasConflictMarkers } from '../merge3'
import { mergeTrees } from '../merge-trees'
import { makeCommit } from '../objects'
import { resolveHead } from '../refs'
import { revParseCommit } from '../revparse'
import { put, requireCommit } from '../store'
import { tick, type CommandResult, type GitEvent, type Repository } from '../state'
import { readTree, writeTree, type FileMap } from '../tree'
import { setHead, updateRef } from '../update-ref'

function treeOf(repo: Repository, commitOid: Oid): FileMap {
  return readTree(repo.store, requireCommit(repo.store, commitOid).tree)
}

function applyPick(repo: Repository, source: Oid, onto: Oid) {
  const commit = requireCommit(repo.store, source)
  const parent = commit.parents[0]
  return mergeTrees(
    parent ? treeOf(repo, parent) : {},
    treeOf(repo, onto),
    treeOf(repo, source),
    { ours: `HEAD (${onto.slice(0, 7)})`, theirs: source.slice(0, 7) },
  )
}

function record(repo: Repository, files: FileMap, source: Oid): { repo: Repository; oid: Oid } {
  const original = requireCommit(repo.store, source)
  const head = resolveHead(repo.refs, repo.head)
  if (!head) throw new GitError('unborn', 'belum ada commit di branch ini')

  const written = writeTree(repo.store, files)
  const ticked = tick({ ...repo, store: written.store })
  const object = makeCommit({
    tree: written.oid,
    parents: [head],
    // git-cherry-pick(1) keeps the original author; the committer is you.
    author: original.author,
    committer: ticked.signature,
    message: original.message,
  })

  return {
    repo: { ...ticked.repo, store: put(ticked.repo.store, object), index: files, worktree: files },
    oid: object.oid,
  }
}

function advance(repo: Repository, oid: Oid, detail: string): Repository {
  const moved =
    repo.head.type === 'attached'
      ? updateRef(repo, repo.head.ref, oid, 'cherry-pick', detail)
      : setHead(repo, { type: 'detached', oid }, 'cherry-pick', detail)
  return moved.repo
}

function run(repo: Repository, queue: readonly Oid[]): CommandResult {
  let working = repo
  const events: GitEvent[] = []
  let remaining = [...queue]

  while (remaining.length > 0) {
    const source = remaining[0]
    const head = resolveHead(working.refs, working.head)
    if (!head) throw new GitError('unborn', 'belum ada commit di branch ini')

    const applied = applyPick(working, source, head)
    if (applied.conflicts.length > 0) {
      return {
        repo: {
          ...working,
          index: applied.files,
          worktree: applied.files,
          pending: {
            type: 'cherry-pick',
            current: source,
            remaining: remaining.slice(1),
            conflicts: applied.conflicts,
          },
        },
        events: [
          ...events,
          { type: 'conflict', paths: applied.conflicts },
          {
            type: 'message',
            tone: 'warn',
            text: `Konflik saat cherry-pick ${source.slice(0, 7)} pada ${applied.conflicts.join(', ')}. Selesaikan, \`add\`, lalu \`cherry-pick --continue\`.`,
          },
        ],
      }
    }

    const recorded = record(working, applied.files, source)
    working = advance(recorded.repo, recorded.oid, `${source.slice(0, 7)} → ${recorded.oid.slice(0, 7)}`)
    events.push({ type: 'object-created', oid: recorded.oid, kind: 'commit' })
    events.push({
      type: 'message',
      tone: 'info',
      text: `${source.slice(0, 7)} disalin sebagai ${recorded.oid.slice(0, 7)} — objek baru, id baru; yang asli tetap di tempatnya.`,
    })
    remaining = remaining.slice(1)
  }

  return { repo: { ...working, pending: null }, events }
}

export function cherryPick(repo: Repository, revisions: readonly string[]): CommandResult {
  if (repo.pending) {
    throw new GitError('pending', `masih ada ${repo.pending.type} yang belum selesai`)
  }
  if (revisions.length === 0) throw new GitError('bad-args', 'cherry-pick butuh minimal satu commit')

  return run(repo, revisions.map((revision) => revParseCommit(repo, revision)))
}

export function cherryPickContinue(repo: Repository): CommandResult {
  const pending = repo.pending
  if (!pending || pending.type !== 'cherry-pick') {
    throw new GitError('no-cherry-pick', 'tidak ada cherry-pick yang sedang berjalan')
  }

  const unresolved = pending.conflicts.filter((path) => {
    const staged = repo.index[path]
    return staged !== undefined && hasConflictMarkers(staged)
  })
  if (unresolved.length > 0) {
    throw new GitError('unresolved', `masih ada penanda konflik di ${unresolved.join(', ')}`)
  }

  const recorded = record({ ...repo, pending: null }, repo.index, pending.current)
  const advanced = advance(recorded.repo, recorded.oid, `lanjut ${pending.current.slice(0, 7)}`)
  return run(advanced, pending.remaining)
}

export function cherryPickAbort(repo: Repository): CommandResult {
  const pending = repo.pending
  if (!pending || pending.type !== 'cherry-pick') {
    throw new GitError('no-cherry-pick', 'tidak ada cherry-pick yang sedang berjalan')
  }
  const head = resolveHead(repo.refs, repo.head)
  const files = head ? treeOf(repo, head) : {}
  return {
    repo: { ...repo, index: files, worktree: files, pending: null },
    events: [{ type: 'message', tone: 'info', text: 'Cherry-pick dibatalkan.' }],
  }
}
