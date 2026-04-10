/**
 * Client-side encryption using Web Crypto API.
 * AES-256-GCM with PBKDF2 key derivation from a passphrase.
 * Cloudflare never sees the plaintext — only the encrypted blob.
 */

const PBKDF2_ITERATIONS = 100_000

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(str: string): ArrayBuffer {
  const bin = atob(str)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptedPayload {
  encrypted: true
  salt: string   // base64
  iv: string     // base64
  data: string   // base64 (ciphertext + auth tag)
}

/** Encrypt a plaintext string. Returns a JSON-serializable payload. */
export async function encrypt(plaintext: string, passphrase: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)

  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  )

  return {
    encrypted: true,
    salt: toBase64(salt.buffer),
    iv: toBase64(iv.buffer),
    data: toBase64(ciphertext),
  }
}

/** Decrypt an encrypted payload back to plaintext. Throws on wrong passphrase. */
export async function decrypt(payload: EncryptedPayload, passphrase: string): Promise<string> {
  const salt = new Uint8Array(fromBase64(payload.salt))
  const iv = new Uint8Array(fromBase64(payload.iv))
  const ciphertext = fromBase64(payload.data)

  const key = await deriveKey(passphrase, salt)
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  )

  return new TextDecoder().decode(plainBuf)
}

/** Check if a parsed JSON object is an encrypted payload. */
export function isEncryptedPayload(obj: unknown): obj is EncryptedPayload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as Record<string, unknown>).encrypted === true &&
    typeof (obj as Record<string, unknown>).salt === 'string' &&
    typeof (obj as Record<string, unknown>).iv === 'string' &&
    typeof (obj as Record<string, unknown>).data === 'string'
  )
}
