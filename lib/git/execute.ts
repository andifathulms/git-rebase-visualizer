/**
 * The dispatcher: one command line in, `{ repo, events }` out. Still pure.
 *
 * Anything not implemented fails here by name — CLAUDE.md invariant 10. There
 * is no fall-through that quietly does nothing, and no command that guesses at
 * a semantic it does not implement.
 */
import { GitError } from './errors'
import { parseLine } from './parse'
import { history, status } from './query'
import { entriesFor, HEAD_LOG } from './reflog'
import { resolveHead, shortRef } from './refs'
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
import { reset } from './commands/reset'
import { revert } from './commands/revert'
import { createTag, deleteTag } from './commands/tag'
import type { ResetMode } from './commands/types'

/** Commands git has that Cangkok deliberately does not — refused by name. */
const OUT_OF_SCOPE: Record<string, string> = {
  clone: 'tidak ada jaringan dan tidak ada filesystem di Cangkok (PRD §4)',
  fetch: 'remote baru masuk di M7',
  push: 'remote baru masuk di M7',
  pull: 'remote baru masuk di M7',
  stash: 'di luar cakupan v1',
  bisect: 'di luar cakupan (PRD §4)',
  submodule: 'di luar cakupan (PRD §4)',
  worktree: 'di luar cakupan (PRD §4)',
  notes: 'di luar cakupan (PRD §4)',
  blame: 'di luar cakupan v1',
  diff: 'belum ada — gunakan panel isi file',
}

function text(result: string, tone: 'info' | 'warn' | 'destructive' = 'info'): CommandResult['events'] {
  return [{ type: 'message', tone, text: result }]
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
        throw new GitError(
          'bad-todo',
          `\`${action}\` bukan aksi todo yang dikenal. Yang ada: ${TODO_ACTIONS.join(', ')}.`,
        )
      }
      if (!/^[0-9a-f]{40}$/.test(oid ?? '')) {
        throw new GitError('bad-todo', `todo butuh oid lengkap 40 karakter, dapat: ${oid}`)
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
    throw new GitError('unsupported', `\`${command}\` tidak didukung: ${reason}.`)
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
        if (!args[0]) throw new GitError('bad-args', 'branch -d butuh nama')
        return deleteBranch(repo, args[0])
      }
      if (args.length === 0) {
        const current = repo.head.type === 'attached' ? shortRef(repo.head.ref) : null
        return {
          repo,
          events: text(
            listBranches(repo)
              .map((name) => `${name === current ? '*' : ' '} ${name}`)
              .join('\n') || '(belum ada branch)',
          ),
        }
      }
      return createBranch(repo, args[0], args[1], flags.has('f') || flags.has('force'))
    }

    case 'checkout':
    case 'switch': {
      const create = flags.has('b') || flags.has('c')
      const target = args[0]
      if (!target) throw new GitError('bad-args', `${command} butuh target`)
      return checkout(repo, { target, create, detach: flags.has('detach') })
    }

    case 'merge':
      if (flags.has('continue')) return mergeContinue(repo)
      if (flags.has('abort')) return mergeAbort(repo)
      if (!args[0]) throw new GitError('bad-args', 'merge butuh sebuah revisi')
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
        throw new GitError(
          'interactive',
          'rebase -i disusun di panel “Rebase interaktif”, yang menuliskan hasilnya kembali sebagai --todo=… supaya tetap bisa diputar ulang.',
        )
      }
      if (!args[0]) throw new GitError('bad-args', 'rebase butuh upstream')
      return rebase(repo, {
        upstream: args[0],
        onto: options.onto,
        todo: options.todo === undefined ? undefined : parseTodo(options.todo),
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
      if (!args[0]) throw new GitError('bad-args', 'revert butuh sebuah commit')
      return revert(repo, args[0])

    case 'tag': {
      if (flags.has('d') || flags.has('delete')) {
        if (!args[0]) throw new GitError('bad-args', 'tag -d butuh nama')
        return deleteTag(repo, args[0])
      }
      if (args.length === 0) {
        return {
          repo,
          events: text(
            Object.keys(repo.refs)
              .filter((ref) => ref.startsWith('refs/tags/'))
              .sort()
              .map(shortRef)
              .join('\n') || '(belum ada tag)',
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
      if (!head) throw new GitError('unborn', 'belum ada commit')
      const limit = options.limit ? Number(options.limit) : 20
      const lines = history(repo, [head], limit).map(
        (entry) => `${entry.oid.slice(0, 7)}  ${entry.message.split('\n')[0]}`,
      )
      return { repo, events: text(lines.join('\n')) }
    }

    case 'status': {
      const report = status(repo)
      const lines = [
        report.detached ? report.head : `On branch ${report.head}`,
        report.staged.length ? `Perubahan yang di-stage:\n  ${report.staged.join('\n  ')}` : '',
        report.unstaged.length ? `Belum di-stage:\n  ${report.unstaged.join('\n  ')}` : '',
        repo.pending ? `Sedang berjalan: ${repo.pending.type} (konflik: ${repo.pending.conflicts.join(', ') || 'tidak ada'})` : '',
        !report.staged.length && !report.unstaged.length ? 'Tidak ada perubahan.' : '',
      ].filter(Boolean)
      return { repo, events: text(lines.join('\n')) }
    }

    case 'reflog': {
      const ref = args[0] ?? HEAD_LOG
      const entries = entriesFor(repo.reflog, ref === 'HEAD' ? HEAD_LOG : ref)
      const lines = entries.map(
        (entry, index) =>
          `${(entry.after ?? '—').slice(0, 7)} ${ref}@{${index}}: ${entry.operation}: ${entry.message}`,
      )
      return { repo, events: text(lines.join('\n') || '(reflog kosong)') }
    }

    case 'gc':
      return gc(repo, { expireReflog: flags.has('expire-reflog') })

    default:
      throw new GitError(
        'unknown-command',
        `\`${command}\` bukan perintah yang dikenal Cangkok. Ketik \`help\` untuk daftar yang didukung.`,
      )
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
] as const
