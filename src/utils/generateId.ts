export function generateId(): string {
  // crypto.randomUUID() requires a secure context (HTTPS or localhost).
  // When accessed over HTTP on a local network IP (e.g. iPad via 192.168.x.x),
  // it throws, so we fall back to a manual UUID v4 implementation.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // Falls through to fallback
    }
  }
  // Fallback: generate UUID v4 using crypto.getRandomValues (available in all contexts)
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 1
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
