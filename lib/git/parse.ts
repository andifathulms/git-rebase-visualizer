/**
 * Tokenising the command line. Real git syntax, so what is learned here
 * transfers — including the leading `git`, which is optional but accepted.
 */
import { GitError } from './errors'

export function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let started = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (quote) {
      if (char === quote) {
        quote = null
      } else if (char === '\\' && quote === '"' && i + 1 < input.length) {
        current += input[++i]
      } else {
        current += char
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      started = true
      continue
    }

    if (/\s/.test(char)) {
      if (started) tokens.push(current)
      current = ''
      started = false
      continue
    }

    current += char
    started = true
  }

  if (quote) throw new GitError('bad-args', 'tanda kutip tidak ditutup')
  if (started) tokens.push(current)

  return tokens
}

export interface ParsedLine {
  readonly command: string
  readonly args: readonly string[]
  readonly flags: ReadonlySet<string>
  /** `--message=x` and `-m x` both land here, keyed without dashes. */
  readonly options: Readonly<Record<string, string>>
}

/** Flags that consume the next token as their value. */
const VALUE_FLAGS: Record<string, string> = {
  '-m': 'message',
  '--message': 'message',
  '--onto': 'onto',
  '-n': 'limit',
  '-C': 'reuse',
}

export function parseLine(input: string): ParsedLine {
  const tokens = tokenize(input)
  if (tokens[0] === 'git') tokens.shift()
  if (tokens.length === 0) throw new GitError('bad-args', 'perintah kosong')

  const command = tokens[0]
  const args: string[] = []
  const flags = new Set<string>()
  const options: Record<string, string> = {}

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.startsWith('--') && token.includes('=')) {
      const split = token.indexOf('=')
      options[token.slice(2, split)] = token.slice(split + 1)
      continue
    }

    const valueKey = VALUE_FLAGS[token]
    if (valueKey) {
      const value = tokens[i + 1]
      if (value === undefined) throw new GitError('bad-args', `${token} butuh nilai`)
      options[valueKey] = value
      i++
      continue
    }

    if (token.startsWith('--')) {
      flags.add(token.slice(2))
      continue
    }

    if (token.startsWith('-') && token.length > 1) {
      // Bundled short flags: `-am "pesan"` becomes -a plus message="pesan".
      const letters = token.slice(1)
      for (let j = 0; j < letters.length; j++) {
        const key = VALUE_FLAGS[`-${letters[j]}`]
        if (key && j === letters.length - 1) {
          const value = tokens[i + 1]
          if (value === undefined) throw new GitError('bad-args', `-${letters[j]} butuh nilai`)
          options[key] = value
          i++
        } else {
          flags.add(letters[j])
        }
      }
      continue
    }

    args.push(token)
  }

  return { command, args, flags, options }
}
