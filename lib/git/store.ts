/**
 * The append-only object store. CLAUDE.md invariant 1.
 *
 * Objects are created, never mutated, never removed except by `sweep`, which
 * only `gc` may call and only with a reachable set computed by traversal. Every
 * git operation in this engine is expressible as "create objects, move refs" —
 * an implementation that wants to mutate a commit is wrong, and worse, teaches
 * the opposite of what the project exists to convey.
 */
import type { Oid } from '@/lib/hash'
import { GitError } from './errors'
import {
  serialize,
  verifyOid,
  type AnnotatedTag,
  type Blob,
  type Commit,
  type GitObject,
  type Tree,
} from './objects'

export interface ObjectStore {
  /** Keyed by oid. Never iterated directly — see `oids()` for the ordering. */
  readonly objects: Readonly<Record<Oid, GitObject>>
}

export const emptyStore: ObjectStore = { objects: {} }

/**
 * Sorted, because `Object.keys` order is only guaranteed by insertion and the
 * store's contents feed snapshots, digests, and the URL encoding.
 * CLAUDE.md invariant 6.
 */
export function oids(store: ObjectStore): Oid[] {
  return Object.keys(store.objects).sort()
}

export function count(store: ObjectStore): number {
  return Object.keys(store.objects).length
}

export function has(store: ObjectStore, oid: Oid): boolean {
  return Object.prototype.hasOwnProperty.call(store.objects, oid)
}

export function get(store: ObjectStore, oid: Oid): GitObject | undefined {
  return has(store, oid) ? store.objects[oid] : undefined
}

export function requireObject(store: ObjectStore, oid: Oid): GitObject {
  const object = get(store, oid)
  if (!object) throw new GitError('missing-object', `objek tidak ada di store: ${oid}`)
  return object
}

function requireOfType<T extends GitObject>(
  store: ObjectStore,
  oid: Oid,
  type: T['type'],
): T {
  const object = requireObject(store, oid)
  if (object.type !== type) {
    throw new GitError('wrong-type', `objek ${oid} bertipe ${object.type}, bukan ${type}`)
  }
  return object as T
}

export const requireCommit = (store: ObjectStore, oid: Oid): Commit =>
  requireOfType<Commit>(store, oid, 'commit')
export const requireTree = (store: ObjectStore, oid: Oid): Tree =>
  requireOfType<Tree>(store, oid, 'tree')
export const requireBlob = (store: ObjectStore, oid: Oid): Blob =>
  requireOfType<Blob>(store, oid, 'blob')
export const requireTag = (store: ObjectStore, oid: Oid): AnnotatedTag =>
  requireOfType<AnnotatedTag>(store, oid, 'tag')

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/**
 * Writes an object. Content-addressing means a repeated write is a no-op: two
 * commits with the same tree share the tree object, which is how a user
 * discovers that git stores snapshots rather than diffs (PRD §5).
 *
 * An oid collision with different bytes would mean the hash was assigned rather
 * than computed, so it throws rather than overwriting.
 */
export function put(store: ObjectStore, object: GitObject): ObjectStore {
  verifyOid(object)

  const existing = get(store, object.oid)
  if (existing) {
    if (!sameBytes(serialize(existing), serialize(object))) {
      throw new GitError(
        'invariant',
        `tabrakan oid dengan isi berbeda pada ${object.oid} — hash pasti diberikan, bukan dihitung`,
      )
    }
    return store
  }

  return { objects: { ...store.objects, [object.oid]: object } }
}

export function putAll(store: ObjectStore, objects: readonly GitObject[]): ObjectStore {
  return objects.reduce(put, store)
}

/**
 * The only removal path in the engine. `gc` computes `keep` by traversal from
 * refs and the reflog — never incrementally, never cached (invariant 7) — and
 * passes it here.
 */
export function sweep(store: ObjectStore, keep: ReadonlySet<Oid>): ObjectStore {
  const objects: Record<Oid, GitObject> = {}
  for (const oid of oids(store)) {
    if (keep.has(oid)) objects[oid] = store.objects[oid]
  }
  return { objects }
}

/**
 * A stable fingerprint of the whole store, used by the determinism tests: the
 * same command sequence must produce a byte-identical store (PRD §8).
 */
export function storeDigest(store: ObjectStore): string {
  return oids(store)
    .map((oid) => {
      const bytes = serialize(store.objects[oid])
      return `${oid} ${store.objects[oid].type} ${bytes.length}`
    })
    .join('\n')
}
