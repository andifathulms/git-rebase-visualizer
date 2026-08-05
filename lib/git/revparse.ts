/**
 * Revision expressions, following gitrevisions(7).
 *
 * This is the part that makes the command bar feel like git rather than like a
 * toy, and it is a well-specified deterministic sub-problem, so it gets a real
 * parser and a fixture table rather than a few special cases.
 *
 * Semantics are taken from the documentation, not from memory. `HEAD^2` versus
 * `HEAD~2` is precisely where memory fails:
 *
 *   gitrevisions(7): "<rev>^<n>, e.g. HEAD^, v1.5.1^0 — a suffix ^ to a
 *   revision parameter means the first parent of that commit object. ^<n> means
 *   the <n>th parent."
 *
 *   gitrevisions(7): "<rev>~<n>, e.g. HEAD~, master~3 — ... means the commit
 *   object that is the <n>th generation ancestor of the named commit object,
 *   following only the first parents."
 *
 * So on a merge commit, `^2` is the second parent and `~2` is the grandparent
 * along the first-parent line. They coincide only by accident.
 */
import type { Oid } from '@/lib/hash'
import { GitError } from './errors'

import { HEADS, REMOTES, TAGS, readRef, resolveHead } from './refs'
import { HEAD_LOG, resolveReflog } from './reflog'
import { get, oids, requireCommit, requireObject } from './store'
import type { Repository } from './state'

/** git's own minimum abbreviation length. */
const MIN_ABBREV = 4

/**
 * gitrevisions(7), "Specifying Revisions": a refname is looked up in this
 * order, and the first match wins. Tags beat branches — worth getting right,
 * because a tag shadowing a branch is a real and confusing situation.
 */
function resolveRefName(repo: Repository, name: string): Oid | undefined {
  const candidates = [
    name,
    `refs/${name}`,
    `${TAGS}${name}`,
    `${HEADS}${name}`,
    `${REMOTES}${name}`,
    `${REMOTES}${name}/HEAD`,
  ]
  for (const candidate of candidates) {
    const oid = readRef(repo.refs, candidate)
    if (oid !== undefined) return oid
  }
  return undefined
}

function resolveOidPrefix(repo: Repository, prefix: string): Oid | undefined {
  if (!/^[0-9a-f]+$/.test(prefix) || prefix.length < MIN_ABBREV || prefix.length > 40) {
    return undefined
  }
  const matches = oids(repo.store).filter((oid) => oid.startsWith(prefix))
  if (matches.length === 0) return undefined
  if (matches.length > 1) {
    const examples = matches.slice(0, 4).map((oid) => oid.slice(0, 10)).join(', ')
    throw new GitError('ambiguous', {
      en: `${prefix} is ambiguous — it matches ${matches.length} objects: ${examples}`,
      id: `${prefix} ambigu — cocok dengan ${matches.length} objek: ${examples}`,
    })
  }
  return matches[0]
}

function resolveBase(repo: Repository, token: string): Oid {
  // gitrevisions(7): "@ alone is a shortcut for HEAD".
  const name = token === '@' ? 'HEAD' : token

  if (name === 'HEAD') {
    const oid = resolveHead(repo.refs, repo.head)
    if (!oid) {
      throw new GitError('unborn', {
        en: 'HEAD does not point at any commit yet — there are no commits on this branch',
        id: 'HEAD belum menunjuk ke commit mana pun — belum ada commit di branch ini',
      })
    }
    return oid
  }

  const byRef = resolveRefName(repo, name)
  if (byRef !== undefined) return byRef

  const byOid = resolveOidPrefix(repo, name)
  if (byOid !== undefined) return byOid

  throw new GitError('unknown-revision', {
    en: `unknown revision: ${name}`,
    id: `revisi tidak dikenal: ${name}`,
  })
}

function nthParent(repo: Repository, oid: Oid, n: number): Oid {
  const commit = requireCommit(repo.store, oid)
  if (n === 0) return oid // `^0` names the commit itself, dereferenced to a commit.
  const parent = commit.parents[n - 1]
  if (parent === undefined) {
    throw new GitError('unknown-revision', {
      en: `${oid.slice(0, 7)} has no parent number ${n} — it has ${commit.parents.length}`,
      id: `${oid.slice(0, 7)} tidak punya parent ke-${n} — commit ini punya ${commit.parents.length} parent`,
    })
  }
  return parent
}

/** Follows only first parents, per the `~<n>` definition quoted above. */
function nthAncestor(repo: Repository, oid: Oid, n: number): Oid {
  let current = oid
  for (let step = 0; step < n; step++) {
    const commit = requireCommit(repo.store, current)
    const parent = commit.parents[0]
    if (parent === undefined) {
      throw new GitError('unknown-revision', {
        en: `${oid.slice(0, 7)}~${n} walks past the root commit — the history is not that long`,
        id: `${oid.slice(0, 7)}~${n} melewati commit akar — riwayat tidak sepanjang itu`,
      })
    }
    current = parent
  }
  return current
}

/**
 * gitrevisions(7): "<rev>^{<type>} ... <rev>^{} ... dereference the tag
 * recursively until a non-tag object is found."
 */
function peel(repo: Repository, oid: Oid, want: string): Oid {
  let current = oid
  while (requireObject(repo.store, current).type === 'tag') {
    const tag = requireObject(repo.store, current)
    if (tag.type !== 'tag') break
    if (want === 'tag') return current
    current = tag.target
  }

  if (want === '') return current

  const object = requireObject(repo.store, current)
  if (want === 'tree' && object.type === 'commit') return object.tree
  if (object.type !== want) {
    throw new GitError('wrong-type', {
      en: `${oid.slice(0, 7)}^{${want}} cannot be satisfied — the object is a ${object.type}`,
      id: `${oid.slice(0, 7)}^{${want}} tidak bisa dipenuhi — objeknya bertipe ${object.type}`,
    })
  }
  return current
}

function parseReflogSuffix(repo: Repository, base: string, inside: string): Oid {
  if (/^\d+$/.test(inside)) {
    const ref = base === '' || base === 'HEAD' || base === '@' ? HEAD_LOG : refNameForLog(repo, base)
    return resolveReflog(repo.reflog, ref, Number(inside))
  }
  throw new GitError('unsupported', {
    en: `@{${inside}} is not supported — this simulator only understands @{n} (a reflog position), not dates or upstream`,
    id: `@{${inside}} tidak didukung — simulator ini hanya mengenal @{n} (posisi reflog), bukan tanggal atau upstream`,
  })
}

function refNameForLog(repo: Repository, name: string): string {
  for (const candidate of [name, `${HEADS}${name}`, `${TAGS}${name}`, `${REMOTES}${name}`]) {
    if (readRef(repo.refs, candidate) !== undefined) return candidate
  }
  // A deleted branch still has a reflog, and recovering from exactly that is
  // the point, so fall back to the qualified name rather than failing.
  return name.startsWith('refs/') ? name : `${HEADS}${name}`
}

/** Resolves a revision expression to an object id. */
export function revParse(repo: Repository, expression: string): Oid {
  const input = expression.trim()
  if (input === '') {
    throw new GitError('unknown-revision', {
      en: 'empty revision expression',
      id: 'ekspresi revisi kosong',
    })
  }

  // Split off the base: everything before the first `~` or `^`.
  const suffixStart = input.search(/[~^]/)
  let base = suffixStart === -1 ? input : input.slice(0, suffixStart)
  const suffixes = suffixStart === -1 ? '' : input.slice(suffixStart)

  let oid: Oid
  const reflogMatch = /^(.*)@\{([^}]*)\}$/.exec(base)
  if (reflogMatch) {
    oid = parseReflogSuffix(repo, reflogMatch[1], reflogMatch[2])
  } else {
    if (base === '') base = 'HEAD'
    oid = resolveBase(repo, base)
  }

  let rest = suffixes
  while (rest.length > 0) {
    const operator = rest[0]
    rest = rest.slice(1)

    if (operator === '~') {
      const digits = /^\d*/.exec(rest)?.[0] ?? ''
      rest = rest.slice(digits.length)
      oid = nthAncestor(repo, oid, digits === '' ? 1 : Number(digits))
      continue
    }

    if (rest.startsWith('{')) {
      const close = rest.indexOf('}')
      if (close === -1) {
        throw new GitError('bad-revision', {
          en: `unclosed brace in: ${expression}`,
          id: `kurung kurawal tidak ditutup pada: ${expression}`,
        })
      }
      const want = rest.slice(1, close)
      rest = rest.slice(close + 1)
      oid = peel(repo, oid, want)
      continue
    }

    const digits = /^\d*/.exec(rest)?.[0] ?? ''
    rest = rest.slice(digits.length)
    oid = nthParent(repo, oid, digits === '' ? 1 : Number(digits))
  }

  return oid
}

/** Resolves and then peels tags, for the many commands that need a commit. */
export function revParseCommit(repo: Repository, expression: string): Oid {
  const oid = revParse(repo, expression)
  const peeled = peel(repo, oid, '')
  const object = get(repo.store, peeled)
  if (!object || object.type !== 'commit') {
    throw new GitError('wrong-type', {
      en: `${expression} does not point at a commit (${object?.type ?? 'no such object'})`,
      id: `${expression} tidak menunjuk ke sebuah commit (${object?.type ?? 'tidak ada'})`,
    })
  }
  return peeled
}

/** Exposed for commands that need to dereference a tag themselves. */
export const peelObject = peel
