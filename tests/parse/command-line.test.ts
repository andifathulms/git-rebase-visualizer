import { describe, expect, it } from 'vitest'
import { execute } from '@/lib/git/execute'
import { parseLine, tokenize } from '@/lib/git/parse'
import { emptyRepository } from '@/lib/git/state'

describe('tokenize', () => {
  it('keeps a quoted message in one token', () => {
    expect(tokenize('commit -m "pesan dengan spasi"')).toEqual([
      'commit',
      '-m',
      'pesan dengan spasi',
    ])
  })

  it('accepts single quotes and escaped quotes', () => {
    expect(tokenize("commit -m 'pesan lain'")).toEqual(['commit', '-m', 'pesan lain'])
    expect(tokenize('commit -m "kata \\"kutip\\""')).toEqual(['commit', '-m', 'kata "kutip"'])
  })

  it('preserves an empty quoted argument', () => {
    expect(tokenize('commit -m ""')).toEqual(['commit', '-m', ''])
  })

  it('rejects an unclosed quote', () => {
    expect(() => tokenize('commit -m "belum ditutup')).toThrow(/unclosed quote/)
  })
})

describe('parseLine', () => {
  it('accepts an optional leading git', () => {
    expect(parseLine('git status').command).toBe('status')
    expect(parseLine('status').command).toBe('status')
  })

  it('separates flags, value options, and positional arguments', () => {
    const parsed = parseLine('rebase --onto main fitur~2 fitur')
    expect(parsed.command).toBe('rebase')
    expect(parsed.options.onto).toBe('main')
    expect(parsed.args).toEqual(['fitur~2', 'fitur'])
  })

  it('handles --key=value', () => {
    expect(parseLine('commit --message=halo').options.message).toBe('halo')
  })

  it('splits bundled short flags and still takes a trailing value', () => {
    const parsed = parseLine('commit -am "pesan"')
    expect(parsed.flags.has('a')).toBe(true)
    expect(parsed.options.message).toBe('pesan')
  })
})

describe('execute — failing loudly', () => {
  const repo = emptyRepository()

  it('names an unknown command', () => {
    expect(() => execute(repo, 'rebasetime')).toThrow(/is not a command Cangkok knows/)
  })

  it('names a deliberately out-of-scope command instead of no-opping', () => {
    expect(() => execute(repo, 'clone https://example.test/x')).toThrow(/is not supported/)
    expect(() => execute(repo, 'stash')).toThrow(/is not supported/)
    expect(() => execute(repo, 'bisect start')).toThrow(/is not supported/)
    // pull is refused on purpose rather than for lack of machinery: it hides
    // the half of its job that rewrites your history.
    expect(() => execute(repo, 'pull')).toThrow(/fetch/)
  })

  it('sends rebase -i to the todo panel rather than guessing', () => {
    expect(() => execute(repo, 'rebase -i HEAD~3')).toThrow(/Interactive rebase/)
  })

  it('defaults reset to --mixed, as git-reset(1) specifies', () => {
    const started = execute(repo, 'commit -m "A" --allow-empty').repo
    const next = execute(started, 'commit -m "B" --allow-empty').repo
    const after = execute(next, 'reset HEAD~1')
    expect(after.repo.index).toEqual({})
    expect(after.events.some((event) => event.type === 'ref-moved')).toBe(true)
  })
})
