/**
 * The shared append-only assertion. CLAUDE.md testing rules: this is not a
 * separate suite, it is run after every command in every test.
 */
import { expect } from 'vitest'
import { serialize } from '@/lib/git/objects'
import { oids, type ObjectStore } from '@/lib/git/store'

export type StoreSnapshot = ReadonlyMap<string, string>

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function snapshotStore(store: ObjectStore): StoreSnapshot {
  const snapshot = new Map<string, string>()
  for (const oid of oids(store)) {
    snapshot.set(oid, `${store.objects[oid].type}:${bytesToHex(serialize(store.objects[oid]))}`)
  }
  return snapshot
}

/**
 * Every object present before must still be present after, byte-identical.
 * New objects are expected; a missing or altered one invalidates the premise of
 * the whole project, so this fails loudly rather than warning.
 */
export function expectAppendOnly(before: StoreSnapshot, after: ObjectStore): void {
  const now = snapshotStore(after)
  for (const [oid, bytes] of before) {
    expect(now.has(oid), `objek ${oid} hilang dari store — store bukan append-only`).toBe(true)
    expect(now.get(oid), `objek ${oid} berubah isinya — store bukan append-only`).toBe(bytes)
  }
}
