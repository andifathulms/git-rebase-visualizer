/**
 * Repository state encodes into the URL hash (PRD §6.8, §4 — no accounts, no
 * server). What is encoded is the command script, not a snapshot: the engine is
 * deterministic, so replaying the script reproduces the repository exactly, and
 * a shared link can never disagree with what the commands actually do.
 */
const PREFIX = '#s='

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeScript(script: readonly string[]): string {
  return PREFIX + toBase64Url(JSON.stringify(script))
}

export function decodeScript(hash: string): string[] | null {
  if (!hash.startsWith(PREFIX)) return null
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(hash.slice(PREFIX.length)))
    if (!Array.isArray(parsed) || parsed.some((line) => typeof line !== 'string')) return null
    return parsed as string[]
  } catch {
    return null
  }
}
