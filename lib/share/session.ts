/**
 * DESIGN-REWORK.md §4: a render-time throw anywhere under app/ used to take
 * the whole page down with nothing to recover — no error.tsx, no boundary.
 * The recovery this app can offer that a generic error page can't is
 * specific to its own model: a session is a list of command lines, not a
 * snapshot, so the lines that got the user into trouble are the whole
 * story. Workbench.tsx mirrors the script here on every change; the error
 * boundary (app/[locale]/error.tsx) reads it back, with nothing shared
 * between them but this key.
 */
const KEY = 'grs:last-script'

export function saveSession(script: readonly string[]): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(script))
  } catch {
    // Private browsing / storage disabled: the session simply isn't
    // recoverable after a crash, same as before this existed.
  }
}

export function readSession(): string[] | null {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.some((line) => typeof line !== 'string')) return null
    return parsed as string[]
  } catch {
    return null
  }
}
