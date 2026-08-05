/**
 * git-gc(1) / git-prune(1): the sweep. The only operation in the engine that
 * removes an object, and it only removes what nothing can name.
 *
 * By default the reflog still names the orphans, so a plain `gc` sweeps almost
 * nothing — which is exactly the honest answer, and the reason panicking after
 * a bad reset is unnecessary. Real git expires the reflog on a schedule
 * (gc.reflogExpire, 90 days by default); here it is an explicit flag, so the
 * user chooses the moment the material actually becomes unrecoverable.
 */
import { gcKeepSet, reachable } from '../reachable'
import { count, oids, sweep } from '../store'
import type { CommandResult, Repository } from '../state'

export function gc(repo: Repository, options: { expireReflog?: boolean } = {}): CommandResult {
  const before = count(repo.store)

  const working: Repository = options.expireReflog ? { ...repo, reflog: [] } : repo
  const keep = options.expireReflog ? reachable(working) : gcKeepSet(working)
  const removed = oids(working.store).filter((oid) => !keep.has(oid))

  const next: Repository = { ...working, store: sweep(working.store, keep) }

  if (removed.length === 0) {
    return {
      repo: next,
      events: [
        {
          type: 'message',
          tone: 'info',
          text: options.expireReflog
            ? {
                en: 'Nothing swept — every object is still reachable from a ref.',
                id: 'Tidak ada yang disapu — semua objek masih terjangkau dari ref.',
              }
            : {
                en: `Nothing swept. All ${before} objects are still reachable from a ref or still named by the reflog. Use \`gc --expire-reflog\` to drop the reflog first — after that the orphans really do go.`,
                id: `Tidak ada yang disapu. ${before} objek masih terjangkau dari ref atau masih disebut reflog. Pakai \`gc --expire-reflog\` untuk membuang reflog lebih dulu — sesudah itu yang yatim benar-benar hilang.`,
              },
        },
      ],
    }
  }

  return {
    repo: next,
    events: [
      {
        type: 'message',
        tone: 'destructive',
        text: {
          en: `${removed.length} of ${before} objects swept. This is the only operation that genuinely deletes, and there is no way back from it.`,
          id: `${removed.length} objek disapu dari ${before}. Ini satu-satunya operasi yang benar-benar menghapus, dan sekarang tidak ada jalan kembali.`,
        },
      },
    ],
  }
}
