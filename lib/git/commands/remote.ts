/**
 * Remotes, `push`, and `fetch`. PRD §6.7 — the most consequential git lesson
 * there is, and it only lands because the object model is honest.
 *
 * The peer is a second ref namespace over the same in-memory store (PRD §4).
 * Nothing here touches a network, and nothing pretends to.
 *
 * git-push(1) on the rule that matters:
 *   "The <src> ref is used to update the <dst> ref ... This is done only if the
 *    <dst> ref is not under refs/heads/, or if the update can be fast-forwarded.
 *    ... The --force flag disables these checks."
 *
 * And on what force costs:
 *   "This can cause the remote repository to lose commits; use it with care."
 *
 * Losing them is exactly what the simulator shows: after a force-push the
 * commits the peer used to have are still in the store and no longer reachable
 * from any of its refs. A collaborator who has not fetched still has them; one
 * who clones afresh never will.
 */
import type { Oid } from '@/lib/hash'
import { GitError } from '../errors'
import { isAncestor } from '../merge-base'
import { reachableFrom, remoteReachable } from '../reachable'
import {
  branchRef,
  headBranch,
  listRefs,
  readRef,
  remoteRef,
  shortRef,
  writeRef,
  type RefName,
} from '../refs'
import type { CommandResult, GitEvent, Repository } from '../state'
import { updateRef } from '../update-ref'

function requireOrigin(repo: Repository, name: string | undefined): void {
  if (name !== undefined && name !== repo.remote.name) {
    throw new GitError('unknown-remote', {
      en: `remote \`${name}\` does not exist. this simulator has exactly one peer, named ${repo.remote.name}.`,
      id: `remote \`${name}\` tidak ada. simulator ini hanya mensimulasikan satu peer, bernama ${repo.remote.name}.`,
    })
  }
}

/** The branch being pushed, from an explicit name or from HEAD. */
function branchToPush(repo: Repository, given: string | undefined): RefName {
  if (given) return branchRef(given)
  const current = headBranch(repo.head)
  if (!current) {
    throw new GitError('detached', {
      en: 'HEAD is detached — name the branch you want to push, because no card is following you.',
      id: 'HEAD sedang detached — sebutkan branch yang mau di-push, karena tidak ada kartu yang mengikuti Anda.',
    })
  }
  return current
}

export function push(
  repo: Repository,
  options: { remote?: string; branch?: string; force?: boolean },
): CommandResult {
  requireOrigin(repo, options.remote)

  const ref = branchToPush(repo, options.branch)
  const local = readRef(repo.refs, ref)
  if (local === undefined) {
    throw new GitError('unknown-ref', {
      en: `branch ${shortRef(ref)} does not exist`,
      id: `branch ${shortRef(ref)} tidak ada`,
    })
  }

  const upstream = readRef(repo.remote.refs, ref)

  if (upstream === local) {
    return {
      repo,
      events: [
        {
          type: 'message',
          tone: 'info',
          text: {
            en: 'Already up to date — nothing to push.',
            id: 'Sudah mutakhir — tidak ada yang di-push.',
          },
        },
      ],
    }
  }

  const fastForward = upstream === undefined || isAncestor(repo.store, upstream, local)

  if (!fastForward && !options.force) {
    // git-push(1) rejects this precisely so the next paragraph cannot happen by
    // accident. Naming what would be lost is the whole value of refusing.
    const wouldDrop = commitsOnlyOnRemote(repo, ref, upstream, local)
    const names = wouldDrop.map((oid) => oid.slice(0, 7)).join(', ')
    throw new GitError('non-fast-forward', {
      en:
        `push rejected: ${shortRef(ref)} on ${repo.remote.name} is not an ancestor of yours — the histories have diverged. ` +
        `Forcing it would leave ${wouldDrop.length} commit(s) on the remote side named by nothing (${names}). ` +
        `Pick them up with \`fetch\` then \`merge\`, or — if you really mean it — \`push --force\`.`,
      id:
        `push ditolak: ${shortRef(ref)} di ${repo.remote.name} bukan leluhur dari milik Anda — riwayatnya sudah berbeda. ` +
        `Memaksa akan membuat ${wouldDrop.length} commit di sisi remote tidak lagi ditunjuk apa pun (${names}). ` +
        `Ambil dulu dengan \`fetch\` lalu \`merge\`, atau — kalau Anda memang yakin — \`push --force\`.`,
    })
  }

  const dropped = fastForward ? [] : commitsOnlyOnRemote(repo, ref, upstream, local)

  const next: Repository = {
    ...repo,
    remote: { ...repo.remote, refs: writeRef(repo.remote.refs, ref, local) },
  }

  // Your record of where the remote is moves too — that is what a
  // remote-tracking ref is for, and it gets a reflog entry like any other ref.
  const tracked = updateRef(
    next,
    remoteRef(repo.remote.name, shortRef(ref)),
    local,
    options.force && !fastForward ? 'push --force' : 'push',
    `${shortRef(ref)} → ${repo.remote.name}`,
  )

  const events: GitEvent[] = [...tracked.events]

  if (dropped.length > 0) {
    events.push({ type: 'commits-orphaned', oids: dropped })
    events.push({
      type: 'message',
      tone: 'destructive',
      text: {
        en:
          `Force-push. ${dropped.length} commit(s) that used to be on ${repo.remote.name}/${shortRef(ref)} ` +
          `are now named by no ref there: ${dropped.map((oid) => oid.slice(0, 7)).join(', ')}. ` +
          `A colleague who already fetched still has them and will see a history that differs from yours; ` +
          `anyone cloning today will never see them at all.`,
        id:
          `Force-push. ${dropped.length} commit yang tadinya ada di ${repo.remote.name}/${shortRef(ref)} ` +
          `sekarang tidak ditunjuk ref mana pun di sana: ${dropped.map((oid) => oid.slice(0, 7)).join(', ')}. ` +
          `Rekan yang sudah terlanjur fetch masih punya commit itu dan akan melihat riwayatnya berbeda dari Anda; ` +
          `yang clone baru tidak akan pernah melihatnya.`,
      },
    })
  } else {
    events.push({
      type: 'message',
      tone: 'info',
      text: {
        en: `${shortRef(ref)} sent to ${repo.remote.name}. Fast-forward — nothing was lost on that side.`,
        id: `${shortRef(ref)} dikirim ke ${repo.remote.name}. Fast-forward — tidak ada yang hilang di sisi sana.`,
      },
    })
  }

  return { repo: tracked.repo, events }
}

/**
 * Commits the remote branch can reach that the incoming one cannot — what a
 * force-push would strand on the peer.
 */
function commitsOnlyOnRemote(
  repo: Repository,
  ref: RefName,
  upstream: Oid | undefined,
  local: Oid,
): Oid[] {
  if (upstream === undefined) return []

  const theirs = reachableFrom(repo.store, [upstream])
  const ours = reachableFrom(repo.store, [local])

  // Any *other* branch on the peer keeps its own commits alive. Excluded by ref
  // name, not by oid: a second branch sitting on the very same commit is
  // precisely the case where nothing is lost, and comparing oids would have
  // discarded it and reported a loss that was not happening.
  const held = reachableFrom(
    repo.store,
    listRefs(repo.remote.refs)
      .filter((name) => name !== ref)
      .map((name) => repo.remote.refs[name]),
  )

  return [...theirs]
    .filter(
      (oid) =>
        !ours.has(oid) && !held.has(oid) && repo.store.objects[oid]?.type === 'commit',
    )
    .sort()
}

export function fetch(repo: Repository, options: { remote?: string } = {}): CommandResult {
  requireOrigin(repo, options.remote)

  let working = repo
  const events: GitEvent[] = []
  let moved = 0

  for (const ref of listRefs(repo.remote.refs)) {
    const tracking = remoteRef(repo.remote.name, shortRef(ref))
    const target = repo.remote.refs[ref]
    if (readRef(working.refs, tracking) === target) continue

    const update = updateRef(working, tracking, target, 'fetch', `dari ${repo.remote.name}`)
    working = update.repo
    events.push(...update.events)
    moved++
  }

  events.push({
    type: 'message',
    tone: 'info',
    text:
      moved === 0
        ? {
            en: `Nothing new on ${repo.remote.name}.`,
            id: `Tidak ada yang baru di ${repo.remote.name}.`,
          }
        : {
            en: `${moved} remote-tracking ref(s) updated. Fetch only moves the ${repo.remote.name}/… cards — your local branches are untouched. Integrate them yourself with \`merge ${repo.remote.name}/main\` or \`rebase ${repo.remote.name}/main\`.`,
            id: `${moved} remote-tracking ref diperbarui. Fetch hanya memindahkan kartu ${repo.remote.name}/… — branch lokal Anda tidak disentuh. Gabungkan sendiri dengan \`merge ${repo.remote.name}/main\` atau \`rebase ${repo.remote.name}/main\`.`,
          },
  })

  return { repo: working, events }
}

/** What a fresh clone of the peer would contain — the collaborator's view. */
export function collaboratorView(repo: Repository): {
  refs: Array<{ ref: RefName; oid: Oid }>
  commits: Oid[]
} {
  const live = remoteReachable(repo)
  return {
    refs: listRefs(repo.remote.refs).map((ref) => ({ ref, oid: repo.remote.refs[ref] })),
    commits: [...live].filter((oid) => repo.store.objects[oid]?.type === 'commit').sort(),
  }
}
