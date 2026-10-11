import { sha256 } from './cryptoUtils';

export function generateSalt(length: number = 16): string {
  const arr = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateApiKey(): string {
  return 'tally_sk_' + generateSalt(24);
}

export function hashPassword(password: string, salt: string): string {
  let hash = password + ':' + salt;
  for (let i = 0; i < 1000; i++) {
    hash = sha256(hash + ':' + salt + ':' + i);
  }
  return hash;
}

/**
 * Constant-time string comparison to prevent timing attacks (CWE-208)
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (typeof Buffer !== 'undefined') {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    let diff = 0;
    for (let i = 0; i < bufA.length; i++) {
      diff |= bufA[i] ^ bufB[i];
    }
    return diff === 0;
  }
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Helper: Hex / Uint8Array conversions
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Universal AES-256-GCM encryption with PBKDF2 key derivation.
 * Works seamlessly in both Node.js and modern Web Browsers via globalThis.crypto.subtle.
 */
export async function encryptAesGcm(
  plaintext: string,
  password: string,
  customSalt?: Uint8Array
): Promise<{ ciphertextBase64: string; ivHex: string; saltHex: string }> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto subtle is required for AES-256-GCM encryption');
  }

  const enc = new TextEncoder();
  const salt = customSalt || new Uint8Array(16);
  if (!customSalt) globalThis.crypto.getRandomValues(salt as any);

  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv as any);

  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(password) as any,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as any, iterations: 10000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const ciphertextBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    enc.encode(plaintext) as any
  );

  return {
    ciphertextBase64: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    ivHex: bytesToHex(iv),
    saltHex: bytesToHex(salt),
  };
}

/**
 * Universal AES-256-GCM decryption with PBKDF2 key derivation.
 * Throws an authentication error if password is incorrect or data has been tampered with.
 */
export async function decryptAesGcm(
  ciphertextBase64: string,
  password: string,
  saltHex: string,
  ivHex: string
): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto subtle is required for AES-256-GCM decryption');
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const salt = hexToBytes(saltHex);
  const iv = hexToBytes(ivHex);
  const ciphertext = base64ToBytes(ciphertextBase64);

  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(password) as any,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as any, iterations: 10000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    ciphertext as any
  );

  return dec.decode(decryptedBuffer);
}
