import { sha1 } from './sha1'
import { concatBytes, utf8Encode } from './utf8'

export { sha1 } from './sha1'
export { utf8Encode, concatBytes } from './utf8'

/** A full 40-character object id, as git stores it. */
export type Oid = string

/**
 * Git's loose-object header: `"<type> <byte length>\0"` followed by the payload,
 * hashed as one run of bytes. Pro Git, "Git Objects" — the same framing produces
 * the ids `git hash-object` reports, which is what makes the oracle meaningful.
 */
export function hashObject(type: string, payload: Uint8Array): Oid {
  const header = utf8Encode(`${type} ${payload.length}\0`)
  return sha1(concatBytes([header, payload]))
}

/** Seven characters, as git displays them. Full ids are what get stored. */
export const SHORT_OID_LENGTH = 7

export function shortOid(oid: Oid): string {
  return oid.slice(0, SHORT_OID_LENGTH)
}
