import { describe, expect, it } from 'vitest'
import { hasConflictMarkers, merge3 } from '@/lib/git/merge3'

const base = ['satu', 'dua', 'tiga', 'empat', 'lima']

describe('merge3 — clean cases', () => {
  it('returns the base when neither side changed anything', () => {
    const result = merge3(base, base, base)
    expect(result.conflicted).toBe(false)
    expect(result.lines).toEqual(base)
  })

  it('takes theirs when only theirs changed', () => {
    const theirs = ['satu', 'DUA', 'tiga', 'empat', 'lima']
    const result = merge3(base, base, theirs)
    expect(result.conflicted).toBe(false)
    expect(result.lines).toEqual(theirs)
  })

  it('takes ours when only ours changed', () => {
    const ours = ['satu', 'dua', 'tiga', 'EMPAT', 'lima']
    const result = merge3(base, ours, base)
    expect(result.conflicted).toBe(false)
    expect(result.lines).toEqual(ours)
  })

  it('combines edits in different regions', () => {
    const ours = ['SATU', 'dua', 'tiga', 'empat', 'lima']
    const theirs = ['satu', 'dua', 'tiga', 'empat', 'LIMA']
    const result = merge3(base, ours, theirs)
    expect(result.conflicted).toBe(false)
    expect(result.lines).toEqual(['SATU', 'dua', 'tiga', 'empat', 'LIMA'])
  })

  it('combines an insertion from each side', () => {
    const ours = ['satu', 'satu setengah', 'dua', 'tiga', 'empat', 'lima']
    const theirs = ['satu', 'dua', 'tiga', 'empat', 'empat setengah', 'lima']
    const result = merge3(base, ours, theirs)
    expect(result.conflicted).toBe(false)
    expect(result.lines).toEqual([
      'satu',
      'satu setengah',
      'dua',
      'tiga',
      'empat',
      'empat setengah',
      'lima',
    ])
  })

  it('accepts the same edit made independently on both sides', () => {
    const both = ['satu', 'DUA', 'tiga', 'empat', 'lima']
    const result = merge3(base, both, both)
    expect(result.conflicted).toBe(false)
    expect(result.lines).toEqual(both)
  })

  it('handles a deletion on one side', () => {
    const theirs = ['satu', 'tiga', 'empat', 'lima']
    const result = merge3(base, base, theirs)
    expect(result.conflicted).toBe(false)
    expect(result.lines).toEqual(theirs)
  })

  it('merges into and out of an empty file', () => {
    expect(merge3([], [], ['baru']).lines).toEqual(['baru'])
    expect(merge3(['lama'], ['lama'], []).lines).toEqual([])
  })
})

describe('merge3 — conflicts', () => {
  it('conflicts when both sides changed the same line differently', () => {
    const ours = ['satu', 'punya kami', 'tiga', 'empat', 'lima']
    const theirs = ['satu', 'punya mereka', 'tiga', 'empat', 'lima']
    const result = merge3(base, ours, theirs)

    expect(result.conflicted).toBe(true)
    const conflict = result.regions.find((region) => region.kind === 'conflict')
    expect(conflict?.base).toEqual(['dua'])
    expect(conflict?.ours).toEqual(['punya kami'])
    expect(conflict?.theirs).toEqual(['punya mereka'])
  })

  it('writes the same markers git writes', () => {
    const result = merge3(
      base,
      ['satu', 'kami', 'tiga', 'empat', 'lima'],
      ['satu', 'mereka', 'tiga', 'empat', 'lima'],
      { ours: 'HEAD', theirs: 'fitur' },
    )
    expect(result.lines).toEqual([
      'satu',
      '<<<<<<< HEAD',
      'kami',
      '=======',
      'mereka',
      '>>>>>>> fitur',
      'tiga',
      'empat',
      'lima',
    ])
    expect(hasConflictMarkers(result.lines)).toBe(true)
  })

  it('conflicts when one side edits a line the other deleted', () => {
    const ours = ['satu', 'dua diubah', 'tiga', 'empat', 'lima']
    const theirs = ['satu', 'tiga', 'empat', 'lima']
    expect(merge3(base, ours, theirs).conflicted).toBe(true)
  })

  it('leaves clean regions on either side of the conflict alone', () => {
    const result = merge3(
      base,
      ['satu', 'kami', 'tiga', 'EMPAT', 'lima'],
      ['satu', 'mereka', 'tiga', 'empat', 'lima'],
    )
    expect(result.conflicted).toBe(true)
    expect(result.lines[0]).toBe('satu')
    // Ours changed `empat` and theirs left it alone, so it merges cleanly even
    // though the same file conflicts higher up.
    expect(result.lines).toContain('EMPAT')
    expect(result.lines[result.lines.length - 1]).toBe('lima')
  })

  it('conflicts on changes to adjacent lines, because there is no context between them', () => {
    // git behaves the same way: two edits with zero unchanged lines between
    // them cannot be interleaved, so the hunk is handed to the user.
    const result = merge3(
      base,
      ['satu', 'dua', 'tiga', 'EMPAT', 'lima'],
      ['satu', 'dua', 'tiga', 'empat', 'LIMA'],
    )
    expect(result.conflicted).toBe(true)
  })

  it('coalesces adjacent conflicting changes into one hunk, as diff3 does', () => {
    // Neither side kept `satu` and `dua` intact and there is no common line
    // between them, so there is nothing to split the hunk on.
    const result = merge3(
      base,
      ['SATU', 'kami', 'tiga', 'empat', 'lima'],
      ['satu', 'mereka', 'tiga', 'empat', 'lima'],
    )
    const conflicts = result.regions.filter((region) => region.kind === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].base).toEqual(['satu', 'dua'])
  })
})

describe('merge3 — determinism', () => {
  it('produces the same output for the same inputs', () => {
    const ours = ['satu', 'a', 'b', 'lima']
    const theirs = ['satu', 'c', 'tiga', 'empat', 'lima']
    expect(merge3(base, ours, theirs)).toEqual(merge3(base, ours, theirs))
  })

  it('is not symmetric in content but is in conflict-ness', () => {
    const ours = ['satu', 'kami', 'lima']
    const theirs = ['satu', 'mereka', 'lima']
    expect(merge3(base, ours, theirs).conflicted).toBe(
      merge3(base, theirs, ours).conflicted,
    )
  })
})
