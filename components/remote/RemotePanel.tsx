'use client'

/**
 * The peer, and what a collaborator would see. PRD §6.7.
 *
 * The interesting column is the last one: commits that are still in the store
 * but that the remote no longer names. A colleague who already fetched still
 * has them locally; one who clones today never will. Showing both facts at once
 * is the point — "lost" is a statement about refs, not about objects.
 */
import { shortOid } from '@/lib/hash'
import { collaboratorView } from '@/lib/git/commands/remote'
import { remoteReachable } from '@/lib/git/reachable'
import { listRefs, shortRef } from '@/lib/git/refs'
import type { Repository } from '@/lib/git/state'

export function RemotePanel({ repo, onRun }: { repo: Repository; onRun: (line: string) => void }) {
  const view = collaboratorView(repo)
  const onPeer = remoteReachable(repo)

  // Commits you can still see that a fresh clone would not get.
  const localOnly = Object.keys(repo.store.objects)
    .filter((oid) => repo.store.objects[oid].type === 'commit' && !onPeer.has(oid))
    .sort()

  const branch = repo.head.type === 'attached' ? shortRef(repo.head.ref) : null

  return (
    <section className="border border-ink/20">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/20 px-3 py-2">
        <span className="label">{repo.remote.name} — sisi rekan</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onRun(branch ? `push origin ${branch}` : 'push')}
            className="border border-catalogue px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.14em] text-catalogue"
          >
            Push
          </button>
          <button
            type="button"
            onClick={() => onRun('fetch')}
            className="border border-catalogue px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.14em] text-catalogue"
          >
            Fetch
          </button>
        </div>
      </header>

      {view.refs.length === 0 ? (
        <p className="px-3 py-2 text-[11px] leading-relaxed text-ink/70">
          Belum ada apa-apa di {repo.remote.name}. <code>push</code> mengirim branch Anda ke sana
          tanpa membuat objek baru — yang berpindah hanya kartunya.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-ink/10">
            {view.refs.map(({ ref, oid }) => {
              const tracking = repo.refs[`refs/remotes/${repo.remote.name}/${shortRef(ref)}`]
              return (
                <li key={ref} className="flex items-baseline justify-between gap-2 px-3 py-1.5">
                  <span className="font-display text-[10px] uppercase tracking-[0.14em] text-catalogue">
                    {repo.remote.name}/{shortRef(ref)}
                  </span>
                  <span className="font-mono text-[11px] text-ink">{shortOid(oid)}</span>
                  {tracking !== oid ? (
                    <span className="font-mono text-[10px] text-stamp">belum di-fetch</span>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <p className="border-t border-ink/20 px-3 py-1.5 text-[11px] text-ink/70">
            Clone baru dari {repo.remote.name} akan berisi{' '}
            <span className="font-mono">{view.commits.length}</span> commit.
          </p>
        </>
      )}

      {localOnly.length > 0 && view.refs.length > 0 ? (
        <div className="border-t border-ink/20 px-3 py-2">
          <p className="label mb-1">Tidak ada di {repo.remote.name} ({localOnly.length})</p>
          <p className="text-[11px] leading-relaxed text-ink/70">
            Masih ada di store Anda, tapi tidak terjangkau dari ref mana pun di sana. Kalau ini
            muncul sesudah <code>push --force</code>, inilah yang hilang bagi orang yang clone hari
            ini — dan yang masih dipegang rekan yang sudah terlanjur fetch.
          </p>
          <p className="mt-1 font-mono text-[11px] text-faded">
            {localOnly.map((oid) => shortOid(oid)).join(' ')}
          </p>
        </div>
      ) : null}

      {listRefs(repo.refs, 'remote').length === 0 && view.refs.length > 0 ? (
        <p className="border-t border-ink/20 px-3 py-1.5 text-[11px] text-ink/70">
          Jalankan <code>fetch</code> untuk memperbarui kartu {repo.remote.name}/… di sisi Anda.
        </p>
      ) : null}
    </section>
  )
}
