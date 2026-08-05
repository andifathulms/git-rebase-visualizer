/**
 * A session is a repository plus the exact list of lines that produced it.
 *
 * Because the engine is deterministic (PRD §8), the line list *is* the state:
 * replaying it anywhere rebuilds a byte-identical repository. That is what
 * makes URL sharing honest rather than a serialisation of a snapshot that might
 * disagree with what the commands would have produced.
 *
 * Still pure — no base64, no URL, no DOM. Those live in lib/share.
 */
import { execute } from './execute'
import { emptyRepository, type CommandResult, type Repository } from './state'

/**
 * The one non-git line the session understands. Editing a file is not a git
 * operation, and pretending otherwise would teach the wrong thing, so it is
 * spelled differently and labelled as such in the UI.
 */
export const WRITE = 'write'

function tokenize(line: string): string[] {
  return (line.match(/"[^"]*"|\S+/g) ?? []).map((token) => token.replace(/^"|"$/g, ''))
}

export function runLine(repo: Repository, line: string): CommandResult {
  const tokens = tokenize(line)

  if (tokens[0] === WRITE) {
    const path = tokens[1]
    if (!path) throw new Error('write butuh path')
    const content = tokens.slice(2).join(' ')
    return {
      repo: { ...repo, worktree: { ...repo.worktree, [path]: content.split('|') } },
      events: [
        {
          type: 'message',
          tone: 'info',
          text: `${path} ditulis di working tree. Ini bukan perintah git — belum ada objek yang dibuat sampai Anda \`add\` dan \`commit\`.`,
        },
      ],
    }
  }

  return execute(repo, line)
}

/** Formats a working-tree edit as a replayable line. */
export function writeLine(path: string, lines: readonly string[]): string {
  return `${WRITE} ${path} "${lines.join('|')}"`
}

export function replay(script: readonly string[]): Repository {
  return script.reduce((repo, line) => runLine(repo, line).repo, emptyRepository())
}
