/**
 * Universal SHA-256 implementation (FIPS 180-4 compliant):
 * Uses Node.js crypto when running in Node.js, and pure JavaScript with Uint32Array
 * in browser / ESM environments with full UTF-8 support.
 */

// Precomputed 64 round constants (first 32 bits of the fractional parts of the cube roots of the first 64 primes)
const K: Uint32Array = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, b: number): number {
  return (n >>> b) | (n << (32 - b));
}

function utf8Encode(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(
        0xe0 | (charcode >> 12),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }
  return new Uint8Array(utf8);
}

export function pureSha256(input: string): string {
  const bytes = utf8Encode(input);
  const len = bytes.length;
  const bitLength = len * 8;

  // Padding: message + 0x80 byte + zeros + 64-bit big-endian length
  // Padded message length in bytes must be congruent to 56 mod 64 (i.e. length + 8 is multiple of 64)
  const paddedLen = Math.ceil((len + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[len] = 0x80;

  // 64-bit length in bits (big-endian)
  const bitLengthHi = Math.floor(bitLength / 0x100000000) >>> 0;
  const bitLengthLo = bitLength >>> 0;
  padded[paddedLen - 8] = (bitLengthHi >>> 24) & 0xff;
  padded[paddedLen - 7] = (bitLengthHi >>> 16) & 0xff;
  padded[paddedLen - 6] = (bitLengthHi >>> 8) & 0xff;
  padded[paddedLen - 5] = bitLengthHi & 0xff;
  padded[paddedLen - 4] = (bitLengthLo >>> 24) & 0xff;
  padded[paddedLen - 3] = (bitLengthLo >>> 16) & 0xff;
  padded[paddedLen - 2] = (bitLengthLo >>> 8) & 0xff;
  padded[paddedLen - 1] = bitLengthLo & 0xff;

  // Initial hash values: first 32 bits of fractional parts of square roots of first 8 primes
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w: Uint32Array = new Uint32Array(64);

  for (let chunk = 0; chunk < paddedLen; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      const offset = chunk + i * 4;
      w[i] =
        ((padded[offset] << 24) |
          (padded[offset + 1] << 16) |
          (padded[offset + 2] << 8) |
          padded[offset + 3]) >>>
        0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
      const s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const toHex = (n: number) => n.toString(16).padStart(8, '0');
  return (
    toHex(h0) +
    toHex(h1) +
    toHex(h2) +
    toHex(h3) +
    toHex(h4) +
    toHex(h5) +
    toHex(h6) +
    toHex(h7)
  );
}

export function sha256(input: string): string {
  // Use Node.js native crypto if available for performance
  if (typeof process !== 'undefined' && process?.versions?.node) {
    try {
      const req = typeof module !== 'undefined' && module.require ? module.require.bind(module) : undefined;
      if (req) {
        const nodeCrypto = req('crypto');
        if (nodeCrypto && typeof nodeCrypto.createHash === 'function') {
          return nodeCrypto.createHash('sha256').update(input).digest('hex');
        }
      }
    } catch {
      // Fall through to pure JS
    }
  }

  return pureSha256(input);
}
