/**
 * The four object types and their canonical serializations.
 *
 * The serializations mirror git's own loose-object format (Pro Git, "Git
 * Objects"). Blobs and trees carry no timestamp and no identity, so when the
 * bytes match git's, the ids match git's too — which is why the oracle can
 * assert tree equality directly rather than only structurally.
 *
 * Commits and tags fold in author and committer identity and a timestamp, so
 * their ids are internally consistent but not equal to what git would produce
 * on a given machine. PRD §5 says so in the UI.
 *
 * A hash is never assigned, only computed — CLAUDE.md invariant 2. That is why
 * every constructor here takes content and returns an object carrying its own
 * oid, and none of them accepts an oid from the caller.
 */
import { concatBytes, hashObject, utf8Encode, type Oid } from '@/lib/hash'
import { GitError, assertNever } from './errors'

export type { Oid }

export type ObjectType = 'blob' | 'tree' | 'commit' | 'tag'

/** File content as an array of lines — the unit the three-way merge works in. */
export interface Blob {
  readonly type: 'blob'
  readonly oid: Oid
  readonly lines: readonly string[]
}

export interface TreeEntry {
  readonly name: string
  readonly oid: Oid
  readonly kind: 'blob' | 'tree'
}

export interface Tree {
  readonly type: 'tree'
  readonly oid: Oid
  /** Always sorted by git's tree ordering; the order feeds the hash. */
  readonly entries: readonly TreeEntry[]
}

export interface Signature {
  readonly name: string
  readonly email: string
  /** Seconds since the epoch, from the virtual clock in state — never Date. */
  readonly timestamp: number
  /** Fixed offset such as `+0700`. */
  readonly timezone: string
}

export interface Commit {
  readonly type: 'commit'
  readonly oid: Oid
  readonly tree: Oid
  /** Empty for a root commit; two or more for a merge. Covered by the hash. */
  readonly parents: readonly Oid[]
  readonly author: Signature
  readonly committer: Signature
  readonly message: string
}

export interface AnnotatedTag {
  readonly type: 'tag'
  readonly oid: Oid
  readonly target: Oid
  readonly targetType: ObjectType
  readonly tagName: string
  readonly tagger: Signature
  readonly message: string
}

export type GitObject = Blob | Tree | Commit | AnnotatedTag

const BLOB_MODE = '100644'
const TREE_MODE = '40000'

/** Git normalises a commit or tag message to end with exactly one newline. */
function normaliseMessage(message: string): string {
  return `${message.replace(/\n+$/, '')}\n`
}

function formatSignature(signature: Signature): string {
  return `${signature.name} <${signature.email}> ${signature.timestamp} ${signature.timezone}`
}

function oidToBytes(oid: Oid): Uint8Array {
  if (!/^[0-9a-f]{40}$/.test(oid)) {
    throw new GitError('invariant', `bukan oid yang sah: ${oid}`)
  }
  const bytes = new Uint8Array(20)
  for (let i = 0; i < 20; i++) bytes[i] = parseInt(oid.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return a.length - b.length
}

/**
 * Git sorts tree entries by name as bytes, but compares a subtree as though its
 * name ended in `/` — see the `base_name_compare` note in git's `tree.c`. This
 * is why `foo.txt` sorts before the directory `foo`.
 */
function treeSortKey(entry: TreeEntry): Uint8Array {
  return utf8Encode(entry.kind === 'tree' ? `${entry.name}/` : entry.name)
}

export function sortTreeEntries(entries: readonly TreeEntry[]): TreeEntry[] {
  return [...entries].sort((a, b) => compareBytes(treeSortKey(a), treeSortKey(b)))
}

export function blobContent(blob: Blob): string {
  // Every line is newline-terminated, so an empty file is empty bytes rather
  // than a single blank line.
  return blob.lines.map((line) => `${line}\n`).join('')
}

export function serialize(object: GitObject): Uint8Array {
  switch (object.type) {
    case 'blob':
      return utf8Encode(blobContent(object))

    case 'tree':
      return concatBytes(
        object.entries.flatMap((entry) => [
          utf8Encode(`${entry.kind === 'tree' ? TREE_MODE : BLOB_MODE} ${entry.name}\0`),
          oidToBytes(entry.oid),
        ]),
      )

    case 'commit': {
      const lines = [
        `tree ${object.tree}`,
        ...object.parents.map((parent) => `parent ${parent}`),
        `author ${formatSignature(object.author)}`,
        `committer ${formatSignature(object.committer)}`,
        '',
        normaliseMessage(object.message),
      ]
      return utf8Encode(lines.join('\n'))
    }

    case 'tag': {
      const lines = [
        `object ${object.target}`,
        `type ${object.targetType}`,
        `tag ${object.tagName}`,
        `tagger ${formatSignature(object.tagger)}`,
        '',
        normaliseMessage(object.message),
      ]
      return utf8Encode(lines.join('\n'))
    }

    default:
      return assertNever(object, 'serialize')
  }
}

function computeOid(object: GitObject): Oid {
  return hashObject(object.type, serialize(object))
}

/**
 * Recomputes the id from the content and refuses the object if it disagrees.
 * Used by the store on every write, so a hand-built object with a stale or
 * invented id cannot enter — CLAUDE.md invariant 2.
 */
export function verifyOid(object: GitObject): void {
  const actual = computeOid(object)
  if (actual !== object.oid) {
    throw new GitError(
      'invariant',
      `oid tidak cocok dengan isi objek: tertulis ${object.oid}, seharusnya ${actual}`,
    )
  }
}

const PLACEHOLDER_OID = '0'.repeat(40)

export function makeBlob(lines: readonly string[]): Blob {
  const draft: Blob = { type: 'blob', oid: PLACEHOLDER_OID, lines: [...lines] }
  return { ...draft, oid: computeOid(draft) }
}

export function makeTree(entries: readonly TreeEntry[]): Tree {
  const sorted = sortTreeEntries(entries)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].name === sorted[i - 1].name) {
      throw new GitError('invariant', `entri tree ganda: ${sorted[i].name}`)
    }
  }
  const draft: Tree = { type: 'tree', oid: PLACEHOLDER_OID, entries: sorted }
  return { ...draft, oid: computeOid(draft) }
}

export function makeCommit(input: {
  tree: Oid
  parents: readonly Oid[]
  author: Signature
  committer: Signature
  message: string
}): Commit {
  const draft: Commit = {
    type: 'commit',
    oid: PLACEHOLDER_OID,
    tree: input.tree,
    parents: [...input.parents],
    author: input.author,
    committer: input.committer,
    message: normaliseMessage(input.message),
  }
  return { ...draft, oid: computeOid(draft) }
}

export function makeTag(input: {
  target: Oid
  targetType: ObjectType
  tagName: string
  tagger: Signature
  message: string
}): AnnotatedTag {
  const draft: AnnotatedTag = {
    type: 'tag',
    oid: PLACEHOLDER_OID,
    target: input.target,
    targetType: input.targetType,
    tagName: input.tagName,
    tagger: input.tagger,
    message: normaliseMessage(input.message),
  }
  return { ...draft, oid: computeOid(draft) }
}

/** The tree with no entries — git's `4b825dc642cb6eb9a060e54bf8d69288fbee4904`. */
export const EMPTY_TREE = makeTree([])
