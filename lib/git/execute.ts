/**
 * The dispatcher: one command line in, `{ repo, events }` out. Still pure.
 *
 * Anything not implemented fails here by name — CLAUDE.md invariant 10. There
 * is no fall-through that quietly does nothing, and no command that guesses at
 * a semantic it does not implement.
 */
import { GitError } from './errors'
import { both, type Localized } from '@/lib/i18n/localized'
import { parseLine } from './parse'
import { history, status } from './query'
import { entriesFor, HEAD_LOG } from './reflog'
import { listRefs, resolveHead, shortRef } from './refs'
import { revParse } from './revparse'
import type { CommandResult, RebaseStep, Repository } from './state'
import { add } from './commands/add'
import { createBranch, deleteBranch, listBranches } from './commands/branch'
import { checkout } from './commands/checkout'
import { cherryPick, cherryPickAbort, cherryPickContinue } from './commands/cherry-pick'
import { commit } from './commands/commit'
import { gc } from './commands/gc'
import { merge, mergeAbort, mergeContinue } from './commands/merge'
import { rebase, rebaseAbort, rebaseContinue, rebaseSkip } from './commands/rebase'
import { fetch, push } from './commands/remote'
import { reset } from './commands/reset'
import { revert } from './commands/revert'
import { diff } from './commands/diff'
import { createTag, deleteTag } from './commands/tag'
import type { ResetMode } from './commands/types'

/** Commands git has that Cangkok deliberately does not — refused by name. */
const OUT_OF_SCOPE: Record<string, Localized> = {
  clone: {
    en: 'Cangkok has no network and no filesystem (PRD §4)',
    id: 'tidak ada jaringan dan tidak ada filesystem di Cangkok (PRD §4)',
  },
  // PRD §6.7 asks for explicit push and fetch. `pull` hides the second half of
  // what it does, and the second half is the part that rewrites your history.
  pull: {
    en: 'deliberately absent — run `fetch` then `merge origin/<branch>` (or `rebase`), so it is visible which step changes your history',
    id: 'sengaja tidak ada — jalankan `fetch` lalu `merge origin/<branch>` (atau `rebase`), supaya terlihat langkah mana yang mengubah riwayat Anda',
  },
  stash: { en: 'out of scope for v1', id: 'di luar cakupan v1' },
  bisect: { en: 'out of scope (PRD §4)', id: 'di luar cakupan (PRD §4)' },
  submodule: { en: 'out of scope (PRD §4)', id: 'di luar cakupan (PRD §4)' },
  worktree: { en: 'out of scope (PRD §4)', id: 'di luar cakupan (PRD §4)' },
  notes: { en: 'out of scope (PRD §4)', id: 'di luar cakupan (PRD §4)' },
  blame: { en: 'out of scope for v1', id: 'di luar cakupan v1' },
}

function text(
  result: Localized,
  tone: 'info' | 'warn' | 'destructive' = 'info',
): CommandResult['events'] {
  return [{ type: 'message', tone, text: result }]
}

/**
 * A listing whose body is oids and ref names — identical in both languages —
 * with a translated placeholder for the empty case.
 */
function listing(lines: readonly string[], empty: Localized): Localized {
  return lines.length === 0 ? empty : both(lines.join('\n'))
}

const TODO_ACTIONS: readonly RebaseStep['action'][] = [
  'pick',
  'reword',
  'squash',
  'fixup',
  'drop',
]

/**
 * `--todo=pick:<oid>,squash:<oid>,reword:<oid>:<message>` — the todo list as one
 * replayable token. git-rebase(1) opens an editor for this; a command line has
 * nowhere to open one, so the panel encodes its result here instead.
 */
function parseTodo(spec: string): RebaseStep[] {
  return spec
    .split(',')
    .filter((item) => item !== '')
    .map((item) => {
      const [action, oid, ...rest] = item.split(':')
      if (!TODO_ACTIONS.includes(action as RebaseStep['action'])) {
        throw new GitError('bad-todo', {
          en: `\`${action}\` is not a todo action Cangkok knows. The list is: ${TODO_ACTIONS.join(', ')}.`,
          id: `\`${action}\` bukan aksi todo yang dikenal. Yang ada: ${TODO_ACTIONS.join(', ')}.`,
        })
      }
      if (!/^[0-9a-f]{40}$/.test(oid ?? '')) {
        throw new GitError('bad-todo', {
          en: `a todo step needs a full 40-character oid, got: ${oid}`,
          id: `todo butuh oid lengkap 40 karakter, dapat: ${oid}`,
        })
      }
      const message = rest.join(':')
      return {
        action: action as RebaseStep['action'],
        oid,
        message: message === '' ? undefined : decodeURIComponent(message),
      }
    })
}

export function execute(repo: Repository, line: string): CommandResult {
  const parsed = parseLine(line)
  const { command, args, flags, options } = parsed

  const reason = OUT_OF_SCOPE[command]
  if (reason) {
    throw new GitError('unsupported', {
      en: `\`${command}\` is not supported: ${reason.en}.`,
      id: `\`${command}\` tidak didukung: ${reason.id}.`,
    })
  }

  switch (command) {
    case 'add':
      return add(repo, args.length > 0 ? args : flags.has('A') ? ['.'] : [])

    case 'commit':
      return commit(repo, {
        message: options.message ?? '',
        allowEmpty: flags.has('allow-empty'),
      })

    case 'branch': {
      if (flags.has('d') || flags.has('D') || flags.has('delete')) {
        if (!args[0]) {
          throw new GitError('bad-args', {
            en: 'branch -d needs a name',
            id: 'branch -d butuh nama',
          })
        }
        return deleteBranch(repo, args[0])
      }
      if (args.length === 0) {
        const current = repo.head.type === 'attached' ? shortRef(repo.head.ref) : null
        return {
          repo,
          events: text(
            listing(
              listBranches(repo).map((name) => `${name === current ? '*' : ' '} ${name}`),
              { en: '(no branches yet)', id: '(belum ada branch)' },
            ),
          ),
        }
      }
      return createBranch(repo, args[0], args[1], flags.has('f') || flags.has('force'))
    }

    case 'checkout':
    case 'switch': {
      const create = flags.has('b') || flags.has('c')
      const target = args[0]
      if (!target) {
        throw new GitError('bad-args', {
          en: `${command} needs a target`,
          id: `${command} butuh target`,
        })
      }
      return checkout(repo, { target, create, detach: flags.has('detach') })
    }

    case 'merge':
      if (flags.has('continue')) return mergeContinue(repo)
      if (flags.has('abort')) return mergeAbort(repo)
      if (!args[0]) {
        throw new GitError('bad-args', {
          en: 'merge needs a revision',
          id: 'merge butuh sebuah revisi',
        })
      }
      return merge(repo, {
        revision: args[0],
        noFastForward: flags.has('no-ff'),
        message: options.message,
      })

    case 'rebase':
      if (flags.has('continue')) return rebaseContinue(repo)
      if (flags.has('abort')) return rebaseAbort(repo)
      if (flags.has('skip')) return rebaseSkip(repo)
      if ((flags.has('i') || flags.has('interactive')) && options.todo === undefined) {
        // An interactive rebase needs a todo list, and a command bar has no
        // editor to open. The panel writes the list back as `--todo=…`, so the
        // resulting line is still replayable and still shareable.
        throw new GitError('interactive', {
          en: 'rebase -i is composed in the “Interactive rebase” panel, which writes its result back as --todo=… so the run stays replayable.',
          id: 'rebase -i disusun di panel “Rebase interaktif”, yang menuliskan hasilnya kembali sebagai --todo=… supaya tetap bisa diputar ulang.',
        })
      }
      if (!args[0]) {
        throw new GitError('bad-args', {
          en: 'rebase needs an upstream',
          id: 'rebase butuh upstream',
        })
      }
      return rebase(repo, {
        upstream: args[0],
        onto: options.onto,
        todo: options.todo === undefined ? undefined : parseTodo(options.todo),
      })

    case 'push':
      return push(repo, {
        remote: args[0],
        branch: args[1],
        force: flags.has('force') || flags.has('f'),
      })

    case 'fetch':
      return fetch(repo, { remote: args[0] })

    case 'remote': {
      const lines = listRefs(repo.remote.refs).map(
        (ref) => `${repo.remote.name}/${shortRef(ref)}  ${repo.remote.refs[ref].slice(0, 7)}`,
      )
      return {
        repo,
        events: text(
          listing(lines, {
            en: `${repo.remote.name} is still empty — nothing has been pushed.`,
            id: `${repo.remote.name} masih kosong — belum ada yang di-push.`,
          }),
        ),
      }
    }

    case 'diff':
      return diff(repo, {
        revisions: args,
        staged: flags.has('staged') || flags.has('cached'),
      })

    case 'cherry-pick':
      if (flags.has('continue')) return cherryPickContinue(repo)
      if (flags.has('abort')) return cherryPickAbort(repo)
      return cherryPick(repo, args)

    case 'reset': {
      const mode: ResetMode = flags.has('soft')
        ? 'soft'
        : flags.has('hard')
          ? 'hard'
          : 'mixed' // git-reset(1): --mixed is the default.
      return reset(repo, { revision: args[0] ?? 'HEAD', mode })
    }

    case 'revert':
      if (!args[0]) {
        throw new GitError('bad-args', {
          en: 'revert needs a commit',
          id: 'revert butuh sebuah commit',
        })
      }
      return revert(repo, args[0])

    case 'tag': {
      if (flags.has('d') || flags.has('delete')) {
        if (!args[0]) {
          throw new GitError('bad-args', { en: 'tag -d needs a name', id: 'tag -d butuh nama' })
        }
        return deleteTag(repo, args[0])
      }
      if (args.length === 0) {
        return {
          repo,
          events: text(
            listing(
              Object.keys(repo.refs)
                .filter((ref) => ref.startsWith('refs/tags/'))
                .sort()
                .map(shortRef),
              { en: '(no tags yet)', id: '(belum ada tag)' },
            ),
          ),
        }
      }
      return createTag(repo, {
        name: args[0],
        revision: args[1],
        message: flags.has('a') || options.message !== undefined ? options.message ?? args[0] : undefined,
        force: flags.has('f') || flags.has('force'),
      })
    }

    case 'log': {
      const head = args[0] ? revParse(repo, args[0]) : resolveHead(repo.refs, repo.head)
      if (!head) {
        throw new GitError('unborn', { en: 'there are no commits yet', id: 'belum ada commit' })
      }
      const limit = options.limit ? Number(options.limit) : 20
      const lines = history(repo, [head], limit).map(
        (entry) => `${entry.oid.slice(0, 7)}  ${entry.message.split('\n')[0]}`,
      )
      // Oids and subjects, so the two languages carry the same body.
      return { repo, events: text(both(lines.join('\n'))) }
    }

    case 'status': {
      const report = status(repo)
      const head = report.detached ? report.head : `On branch ${report.head}`
      const compose = (locale: 'en' | 'id') => {
        const t = {
          en: {
            staged: 'Changes staged for commit:',
            unstaged: 'Not staged:',
            pending: (kind: string, paths: string) => `In progress: ${kind} (conflicts: ${paths})`,
            none: 'none',
            clean: 'Nothing to commit.',
          },
          id: {
            staged: 'Perubahan yang di-stage:',
            unstaged: 'Belum di-stage:',
            pending: (kind: string, paths: string) =>
              `Sedang berjalan: ${kind} (konflik: ${paths})`,
            none: 'tidak ada',
            clean: 'Tidak ada perubahan.',
          },
        }[locale]

        return [
          head,
          report.staged.length ? `${t.staged}\n  ${report.staged.join('\n  ')}` : '',
          report.unstaged.length ? `${t.unstaged}\n  ${report.unstaged.join('\n  ')}` : '',
          repo.pending
            ? t.pending(repo.pending.type, repo.pending.conflicts.join(', ') || t.none)
            : '',
          !report.staged.length && !report.unstaged.length ? t.clean : '',
        ]
          .filter(Boolean)
          .join('\n')
      }

      return { repo, events: text({ en: compose('en'), id: compose('id') }) }
    }

    case 'reflog': {
      const ref = args[0] ?? HEAD_LOG
      const entries = entriesFor(repo.reflog, ref === 'HEAD' ? HEAD_LOG : ref)
      const lines = entries.map(
        (entry, index) =>
          `${(entry.after ?? '—').slice(0, 7)} ${ref}@{${index}}: ${entry.operation}: ${entry.message}`,
      )
      return {
        repo,
        events: text(listing(lines, { en: '(reflog is empty)', id: '(reflog kosong)' })),
      }
    }

    case 'gc':
      return gc(repo, { expireReflog: flags.has('expire-reflog') })

    default:
      throw new GitError('unknown-command', {
        en: `\`${command}\` is not a command Cangkok knows. The supported list is: ${SUPPORTED_COMMANDS.join(', ')}.`,
        id: `\`${command}\` bukan perintah yang dikenal Cangkok. Yang didukung: ${SUPPORTED_COMMANDS.join(', ')}.`,
      })
  }
}

export const SUPPORTED_COMMANDS = [
  'add',
  'commit',
  'branch',
  'checkout',
  'switch',
  'merge',
  'rebase',
  'cherry-pick',
  'reset',
  'revert',
  'tag',
  'log',
  'status',
  'reflog',
  'gc',
  'push',
  'fetch',
  'remote',
  'diff',
] as const
