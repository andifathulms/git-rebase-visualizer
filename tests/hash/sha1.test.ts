import { describe, expect, it } from 'vitest'
import { hashObject, sha1, shortOid } from '@/lib/hash'
import { utf8Encode } from '@/lib/hash/utf8'

const s = (text: string) => sha1(utf8Encode(text))

describe('sha1 — published test vectors', () => {
  // FIPS 180-4 / RFC 3174 §7.3 sample messages.
  it('hashes the empty message', () => {
    expect(s('')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
  })

  it('hashes "abc"', () => {
    expect(s('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d')
  })

  it('hashes the 448-bit two-block message', () => {
    expect(s('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '84983e441c3bd26ebaae4aa1f95129e5e54670f1',
    )
  })

  it('hashes the 896-bit message', () => {
    expect(
      s(
        'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmn' +
          'hijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
      ),
    ).toBe('a49b2446a02c645bf419f995b67091253a04a259')
  })

  it('hashes one million "a" characters', () => {
    expect(s('a'.repeat(1_000_000))).toBe('34aa973cd4c4daa4f61eeb2bdbad27316534016f')
  })

  it('hashes the pangram', () => {
    expect(s('The quick brown fox jumps over the lazy dog')).toBe(
      '2fd4e1c67a2d28fced849ee1bb76e7391b93eb12',
    )
  })

  it('handles every block-boundary length around 56 and 64 bytes', () => {
    // The padding rule changes at 56 bytes per block; these lengths are where a
    // hand-written implementation goes wrong. Recorded from `shasum(1)`.
    expect(s('a'.repeat(55))).toBe('c1c8bbdc22796e28c0e15163d20899b65621d65a')
    expect(s('a'.repeat(56))).toBe('c2db330f6083854c99d4b5bfb6e8f29f201be699')
    expect(s('a'.repeat(63))).toBe('03f09f5b158a7a8cdad920bddc29b81c18a551f5')
    expect(s('a'.repeat(64))).toBe('0098ba824b5c16427bd7a1122a5a442a25ec644d')
    expect(s('a'.repeat(65))).toBe('11655326c708d70319be2610e8a57d9a5b959d3b')
  })
})

describe('sha1 — non-ASCII', () => {
  it('hashes UTF-8 bytes, not UTF-16 code units', () => {
    // `printf 'ä' | sha1sum` — proves the encoder emits two bytes here.
    expect(s('ä')).toBe('961fa22f61a56e19f3f5f8867901ac8cf5e6d11f')
    expect(utf8Encode('ä')).toEqual(Uint8Array.from([0xc3, 0xa4]))
  })

  it('encodes an astral code point as four bytes', () => {
    expect(utf8Encode('😀')).toEqual(Uint8Array.from([0xf0, 0x9f, 0x98, 0x80]))
  })
})

describe('hashObject — git loose-object framing', () => {
  // `printf 'hello\n' | git hash-object --stdin`
  it('matches git for a blob', () => {
    expect(hashObject('blob', utf8Encode('hello\n'))).toBe(
      'ce013625030ba8dba906f756967f9e9ca394464a',
    )
  })

  // `git hash-object -t blob /dev/null`
  it('matches git for an empty blob', () => {
    expect(hashObject('blob', new Uint8Array(0))).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')
  })

  it('separates types — the same payload under two types differs', () => {
    const payload = utf8Encode('x')
    expect(hashObject('blob', payload)).not.toBe(hashObject('commit', payload))
  })
})

describe('shortOid', () => {
  it('displays seven characters, as git does', () => {
    expect(shortOid('ce013625030ba8dba906f756967f9e9ca394464a')).toBe('ce01362')
  })
})
