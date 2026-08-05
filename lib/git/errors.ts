/**
 * Every failure is loud and names what went wrong. CLAUDE.md invariant 10: a
 * confident wrong answer is the worst output this project can give, so there is
 * no silent no-op path anywhere in the engine.
 */
export class GitError extends Error {
  /** Machine-readable so the UI can style a class of failure without parsing. */
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'GitError'
    this.code = code
  }
}

export function unsupported(what: string): never {
  throw new GitError(
    'unsupported',
    `${what} tidak didukung di Cangkok. Lihat PRD §4 untuk apa yang sengaja di luar cakupan.`,
  )
}

/** Exhaustiveness guard for discriminated unions. */
export function assertNever(value: never, context: string): never {
  throw new GitError('invariant', `${context}: kasus tidak tertangani ${JSON.stringify(value)}`)
}
