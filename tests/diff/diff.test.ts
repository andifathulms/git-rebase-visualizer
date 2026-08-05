import { describe, expect, it } from 'vitest'
import { diffLines, diffTrees, formatDiff } from '@/lib/git/diff'
import { diffFiles } from '@/lib/git/commands/diff'
import { execute } from '@/lib/git/execute'
import { commitFile, edit, newRepo, step } from '../helpers/repo'
import { add } from '@/lib/git/commands/add'
import { count } from '@/lib/git/store'

describe('diffLines', () => {
  it('reports nothing for identical content', () => {
    const lines = diffLines(['a', 'b'], ['a', 'b'])
    expect(lines.every((line) => line.kind === 'context')).toBe(true)
  })

  it('marks an insertion', () => {
    expect(diffLines(['a', 'c'], ['a', 'b', 'c'])).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'added', text: 'b' },
      { kind: 'context', text: 'c' },
    ])
  })

  it('marks a deletion', () => {
    expect(diffLines(['a', 'b', 'c'], ['a', 'c'])).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'removed', text: 'b' },
      { kind: 'context', text: 'c' },
    ])
  })

  it('marks a change as a removal plus an addition, as git does', () => {
    expect(diffLines(['a', 'b'], ['a', 'B'])).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'removed', text: 'b' },
      { kind: 'added', text: 'B' },
    ])
  })

  it('handles both empty sides', () => {
    expect(diffLines([], [])).toEqual([])
    expect(diffLines([], ['x'])).toEqual([{ kind: 'added', text: 'x' }])
    expect(diffLines(['x'], [])).toEqual([{ kind: 'removed', text: 'x' }])
  })

  it('keeps every original line accounted for', () => {
    const before = ['satu', 'dua', 'tiga', 'empat']
    const after = ['satu', 'TIGA', 'empat', 'lima']
    const lines = diffLines(before, after)

    expect(lines.filter((l) => l.kind !== 'added').map((l) => l.text)).toEqual(before)
    expect(lines.filter((l) => l.kind !== 'removed').map((l) => l.text)).toEqual(after)
  })
})

describe('diffTrees', () => {
  it('skips unchanged files entirely', () => {
    expect(diffTrees({ 'a.txt': ['x'] }, { 'a.txt': ['x'] })).toEqual([])
  })

  it('classifies added, removed, and modified', () => {
    const files = diffTrees(
      { 'gone.txt': ['x'], 'same.txt': ['s'], 'edit.txt': ['a'] },
      { 'new.txt': ['y'], 'same.txt': ['s'], 'edit.txt': ['b'] },
    )
    expect(files.map((file) => [file.path, file.status])).toEqual([
      ['edit.txt', 'modified'],
      ['gone.txt', 'removed'],
      ['new.txt', 'added'],
    ])
  })

  it('counts insertions and deletions per file', () => {
    const [file] = diffTrees({ 'a.txt': ['satu', 'dua'] }, { 'a.txt': ['satu', 'DUA', 'tiga'] })
    expect(file.added).toBe(2)
    expect(file.removed).toBe(1)
  })
})

describe('formatDiff', () => {
  it('renders in git-recognisable form', () => {
    const files = diffTrees({ 'a.txt': ['satu', 'dua'] }, { 'a.txt': ['satu', 'DUA'] })
    expect(formatDiff(files)).toBe(
      ['diff --git a/a.txt b/a.txt', '--- a/a.txt', '+++ b/a.txt', ' satu', '-dua', '+DUA'].join(
        '\n',
      ),
    )
  })

  it('uses /dev/null for a file that only exists on one side', () => {
    expect(formatDiff(diffTrees({}, { 'new.txt': ['x'] }))).toContain('--- /dev/null')
    expect(formatDiff(diffTrees({ 'old.txt': ['x'] }, {}))).toContain('+++ /dev/null')
  })
})

describe('the diff command', () => {
  it('compares two commits', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['satu'], 'A')
    repo = commitFile(repo, 'a.txt', ['satu', 'dua'], 'B')

    const files = diffFiles(repo, { revisions: ['HEAD~1', 'HEAD'] })
    expect(files).toHaveLength(1)
    expect(files[0].added).toBe(1)
    expect(files[0].removed).toBe(0)
  })

  it('compares the index against HEAD with --staged', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['satu'], 'A')
    repo = edit(repo, 'a.txt', ['satu', 'dua'])
    repo = step(repo, (r) => add(r, ['a.txt']))

    expect(diffFiles(repo, { revisions: [], staged: true })).toHaveLength(1)
    // Index and working tree agree once it is staged.
    expect(diffFiles(repo, { revisions: [] })).toHaveLength(0)
  })

  it('compares the working tree against the index by default', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['satu'], 'A')
    repo = edit(repo, 'a.txt', ['diubah'])
    expect(diffFiles(repo, { revisions: [] })).toHaveLength(1)
  })

  it('creates and moves nothing', () => {
    let repo = commitFile(newRepo(), 'a.txt', ['satu'], 'A')
    repo = commitFile(repo, 'a.txt', ['satu', 'dua'], 'B')

    const before = count(repo.store)
    const result = execute(repo, 'diff HEAD~1 HEAD')

    expect(count(result.repo.store)).toBe(before)
    expect(result.repo.refs).toEqual(repo.refs)
    expect(result.events.every((event) => event.type === 'message')).toBe(true)
  })

  it('says so plainly when there is no difference', () => {
    const repo = commitFile(newRepo(), 'a.txt', ['satu'], 'A')
    const result = execute(repo, 'diff HEAD HEAD')
    const event = result.events[0]
    expect(event.type === 'message' && event.text.en).toMatch(/No difference/)
    expect(event.type === 'message' && event.text.id).toMatch(/Tidak ada beda/)
  })

  it('shows a rebase produced identical content under a different id', () => {
    // The teaching case: diff the original against its replayed copy and get
    // nothing, while the two ids differ.
    let repo = commitFile(newRepo(), 'a.txt', ['A'], 'A')
    repo = execute(repo, 'branch fitur').repo
    repo = commitFile(repo, 'main.txt', ['B'], 'B')
    repo = execute(repo, 'checkout fitur').repo
    repo = commitFile(repo, 'fitur.txt', ['C'], 'C')

    const before = repo.refs['refs/heads/fitur']
    repo = execute(repo, 'rebase main').repo
    const after = repo.refs['refs/heads/fitur']

    expect(after).not.toBe(before)
    // The trees differ only by main.txt, which the rebase brought along.
    const files = diffFiles(repo, { revisions: [before, after] })
    expect(files.map((file) => file.path)).toEqual(['main.txt'])
  })
})
