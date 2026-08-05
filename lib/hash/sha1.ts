/**
 * SHA-1, synchronous, per FIPS 180-4 §6.1.2.
 *
 * Not `SubtleCrypto`: that is async and browser-only, and an async hash would
 * make the whole engine async and therefore untestable in the shape the rest of
 * the project depends on. See CLAUDE.md invariant 4.
 *
 * SHA-1 is used because git uses it. It is broken for adversarial collision
 * resistance and this project makes no security claim — PRD §4 says so.
 */

function rotl(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0
}

export function sha1(message: Uint8Array): string {
  const byteLength = message.length
  const bitLength = byteLength * 8

  // Pad: a single 1 bit, then zeros, then the 64-bit big-endian bit length.
  const blocks = Math.ceil((byteLength + 9) / 64)
  const padded = new Uint8Array(blocks * 64)
  padded.set(message)
  padded[byteLength] = 0x80

  const lengthHigh = Math.floor(bitLength / 0x100000000)
  const lengthLow = bitLength - lengthHigh * 0x100000000
  const tail = padded.length - 8
  padded[tail] = (lengthHigh >>> 24) & 0xff
  padded[tail + 1] = (lengthHigh >>> 16) & 0xff
  padded[tail + 2] = (lengthHigh >>> 8) & 0xff
  padded[tail + 3] = lengthHigh & 0xff
  padded[tail + 4] = (lengthLow >>> 24) & 0xff
  padded[tail + 5] = (lengthLow >>> 16) & 0xff
  padded[tail + 6] = (lengthLow >>> 8) & 0xff
  padded[tail + 7] = lengthLow & 0xff

  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0

  const w = new Uint32Array(80)

  for (let block = 0; block < blocks; block++) {
    const base = block * 64

    for (let i = 0; i < 16; i++) {
      const o = base + i * 4
      w[i] =
        ((padded[o] << 24) | (padded[o + 1] << 16) | (padded[o + 2] << 8) | padded[o + 3]) >>> 0
    }
    for (let i = 16; i < 80; i++) {
      w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1)
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4

    for (let i = 0; i < 80; i++) {
      let f: number
      let k: number
      if (i < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (i < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }

      // Every term is below 2^32, so the sum stays exact in a double and
      // `>>> 0` performs the mod-2^32 reduction.
      const temp = (rotl(a, 5) + (f >>> 0) + e + k + w[i]) >>> 0
      e = d
      d = c
      c = rotl(b, 30)
      b = a
      a = temp
    }

    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
  }

  return [h0, h1, h2, h3, h4].map((part) => part.toString(16).padStart(8, '0')).join('')
}
