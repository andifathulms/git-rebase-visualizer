/**
 * git-commit(1): "Create a new commit containing the current contents of the
 * index and the given log message describing the changes."
 *
 * Note what this does not do: it does not move anything. It writes new objects
 * and then moves a ref. Every operation in this engine has that shape.
 */
import type { Oid } from '@/lib/hash'
import { GitError } from '../errors'
import { makeCommit } from '../objects'
import { resolveHead } from '../refs'
import { put, requireCommit } from '../store'
import { tick, type CommandResult, type GitEvent, type Repository } from '../state'
import { writeTree } from '../tree'
import { setHead, updateRef } from '../update-ref'

export function commit(
  repo: Repository,
  options: { message: string; allowEmpty?: boolean },
): CommandResult {
  const message = options.message.trim()
  if (message === '') throw new GitError('bad-args', 'commit butuh pesan: commit -m "…"')

  const parentOid = resolveHead(repo.refs, repo.head)
  const parents: Oid[] = parentOid ? [parentOid] : []

  const written = writeTree(repo.store, repo.index)

  if (!options.allowEmpty && parentOid) {
    const parent = requireCommit(written.store, parentOid)
    if (parent.tree === written.oid) {
      throw new GitError(
        'nothing-to-commit',
        'tidak ada yang di-commit — index identik dengan HEAD. Pakai --allow-empty jika memang disengaja.',
      )
    }
  }

  const ticked = tick({ ...repo, store: written.store })
  const object = makeCommit({
    tree: written.oid,
    parents,
    // The virtual clock stamps both, so a run is reproducible on any machine.
    author: ticked.signature,
    committer: ticked.signature,
    message,
  })

  let next = { ...ticked.repo, store: put(ticked.repo.store, object) }
  const events: GitEvent[] = [{ type: 'object-created', oid: object.oid, kind: 'commit' }]

  const detail = `commit: ${message.split('\n')[0]}`
  if (next.head.type === 'attached') {
    const moved = updateRef(next, next.head.ref, object.oid, 'commit', detail)
    next = moved.repo
    events.push(...moved.events)
  } else {
    // Committing while detached: HEAD itself advances and no branch follows —
    // exactly how work gets orphaned, so the reflog entry matters most here.
    const moved = setHead(next, { type: 'detached', oid: object.oid }, 'commit', detail)
    next = moved.repo
    events.push(...moved.events)
  }

  // The working tree keeps whatever was not staged; the index is now HEAD.
  return { repo: next, events }
}
