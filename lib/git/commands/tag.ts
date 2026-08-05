/**
 * git-tag(1). Two kinds, and the difference is visible in the object store:
 *
 *   lightweight — "a tag ... is just a name for an object"; a ref, no object;
 *   annotated   — "-a ... make an unsigned, annotated tag object".
 *
 * Creating a lightweight tag adds nothing to the shelf. Creating an annotated
 * one adds a box of its own, which is why `v1^{commit}` has to peel.
 */
import { GitError } from '../errors'
import { makeTag } from '../objects'
import { readRef, tagRef } from '../refs'
import { revParse } from '../revparse'
import { put, requireObject } from '../store'
import { tick, type CommandResult, type Repository } from '../state'
import { updateRef } from '../update-ref'
import { validateBranchName } from './branch'

export function createTag(
  repo: Repository,
  options: { name: string; revision?: string; message?: string; force?: boolean },
): CommandResult {
  validateBranchName(options.name)
  const ref = tagRef(options.name)

  if (readRef(repo.refs, ref) !== undefined && !options.force) {
    throw new GitError('exists', {
      en: `tag ${options.name} already exists`,
      id: `tag ${options.name} sudah ada`,
    })
  }

  const target = revParse(repo, options.revision ?? 'HEAD')

  if (options.message === undefined) {
    const moved = updateRef(repo, ref, target, 'tag', `lightweight di ${target.slice(0, 7)}`)
    return {
      repo: moved.repo,
      events: [
        ...moved.events,
        {
          type: 'message',
          tone: 'info',
          text: {
            en: `Tag ${options.name} created as a ref only — no new object.`,
            id: `Tag ${options.name} dibuat sebagai ref saja — tidak ada objek baru.`,
          },
        },
      ],
    }
  }

  const ticked = tick(repo)
  const object = makeTag({
    target,
    targetType: requireObject(repo.store, target).type,
    tagName: options.name,
    tagger: ticked.signature,
    message: options.message,
  })

  const withObject = { ...ticked.repo, store: put(ticked.repo.store, object) }
  const moved = updateRef(withObject, ref, object.oid, 'tag', `annotated ${object.oid.slice(0, 7)}`)

  return {
    repo: moved.repo,
    events: [
      { type: 'object-created', oid: object.oid, kind: 'tag' },
      ...moved.events,
      {
        type: 'message',
        tone: 'info',
        text: {
          en: `Tag ${options.name} created as object ${object.oid.slice(0, 7)}, pointing at ${target.slice(0, 7)}. Use ${options.name}^{commit} to peel through it.`,
          id: `Tag ${options.name} dibuat sebagai objek ${object.oid.slice(0, 7)} yang menunjuk ke ${target.slice(0, 7)}. Gunakan ${options.name}^{commit} untuk menembusnya.`,
        },
      },
    ],
  }
}

export function deleteTag(repo: Repository, name: string): CommandResult {
  const ref = tagRef(name)
  if (readRef(repo.refs, ref) === undefined) {
    throw new GitError('unknown-ref', {
      en: `tag ${name} does not exist`,
      id: `tag ${name} tidak ada`,
    })
  }
  const moved = updateRef(repo, ref, null, 'tag: Deleted', name)
  return {
    repo: moved.repo,
    events: [
      ...moved.events,
      {
        type: 'message',
        tone: 'destructive',
        text: {
          en: `Tag ${name} deleted; its object is still there.`,
          id: `Tag ${name} dihapus; objeknya tetap ada.`,
        },
      },
    ],
  }
}
