/**
 * Every failure is loud and names what went wrong. CLAUDE.md invariant 10: a
 * confident wrong answer is the worst output this project can give, so there is
 * no silent no-op path anywhere in the engine.
 *
 * Errors carry both interface languages. `Error.message` holds the English one,
 * because that is the default locale and because a stack trace or a failing
 * test should be readable without a translation step; `text` carries the pair
 * for the UI to choose from.
 */
import type { Localized } from '@/lib/i18n/localized'

export class GitError extends Error {
  /** Machine-readable so the UI can style a class of failure without parsing. */
  readonly code: string

  /** The same message in both interface languages. */
  readonly text: Localized

  constructor(code: string, text: Localized) {
    super(text.en)
    this.name = 'GitError'
    this.code = code
    this.text = text
  }
}

export function unsupported(what: { en: string; id: string }): never {
  throw new GitError('unsupported', {
    en: `${what.en} is not supported by this simulator. PRD §4 lists what is deliberately out of scope.`,
    id: `${what.id} tidak didukung di simulator ini. Lihat PRD §4 untuk apa yang sengaja di luar cakupan.`,
  })
}

/** Exhaustiveness guard for discriminated unions. */
export function assertNever(value: never, context: string): never {
  throw new GitError('invariant', {
    en: `${context}: unhandled case ${JSON.stringify(value)}`,
    id: `${context}: kasus tidak tertangani ${JSON.stringify(value)}`,
  })
}
