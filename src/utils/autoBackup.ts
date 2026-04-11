import { useStore } from '../store'
import { encrypt, decrypt, isEncryptedPayload } from './crypto'

/** Build the event data snapshot from current store state. */
function getEventSnapshot() {
  const { eventName, categories, guests, orders, payments } = useStore.getState()
  return {
    version: 1,
    type: 'kohost-event' as const,
    exportedAt: new Date().toISOString(),
    eventName,
    categories,
    guests,
    orders,
    payments,
  }
}

/** Push encrypted backup to the Cloudflare Worker. Fails silently (logs to console). */
async function cloudBackup() {
  const { cloudBackupUrl, cloudBackupSecret } = useStore.getState()
  if (!cloudBackupUrl || !cloudBackupSecret) {
    console.log('[autoBackup] Skipped — no URL or secret configured')
    return
  }

  console.log('[autoBackup] Starting cloud backup to', cloudBackupUrl)
  const data = getEventSnapshot()
  try {
    // Encrypt the entire snapshot before sending
    const encrypted = await encrypt(JSON.stringify(data), cloudBackupSecret)
    console.log('[autoBackup] Encrypted, sending...')

    const res = await fetch(`${cloudBackupUrl}/backup`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Backup-Secret': cloudBackupSecret,
      },
      body: JSON.stringify(encrypted),
    })
    if (res.ok) {
      console.log('[autoBackup] Cloud backup saved successfully')
    } else {
      console.warn('[autoBackup] Cloud backup failed:', res.status, await res.text())
    }
  } catch (err) {
    console.warn('[autoBackup] Cloud backup error:', err)
  }
}

/** Restore from cloud backup. Decrypts client-side. Returns event data or error string. */
export async function restoreFromCloud(): Promise<{
  eventName: string
  categories: unknown[]
  guests: unknown[]
  orders: unknown[]
  payments: unknown[]
} | string> {
  const { cloudBackupUrl, cloudBackupSecret } = useStore.getState()
  if (!cloudBackupUrl || !cloudBackupSecret) return 'No URL or secret configured'

  try {
    const res = await fetch(`${cloudBackupUrl}/backup`, {
      method: 'GET',
      headers: { 'X-Backup-Secret': cloudBackupSecret },
    })
    if (res.status === 401) return 'Invalid secret'
    if (res.status === 404) return 'No backup found on server'
    if (!res.ok) return `Server error: ${res.status}`

    const raw = await res.text()
    // The Worker stores whatever we send. Parse the outer JSON.
    let payload: unknown
    try {
      payload = JSON.parse(raw)
    } catch {
      return 'Could not parse server response'
    }

    // If the parsed result is still a string, it was double-encoded — parse again
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload)
      } catch {
        return 'Could not parse backup data'
      }
    }

    // Decrypt if encrypted, otherwise treat as plain JSON (backwards compatible)
    let data: Record<string, unknown>
    if (isEncryptedPayload(payload)) {
      try {
        const plaintext = await decrypt(payload, cloudBackupSecret)
        data = JSON.parse(plaintext)
      } catch (err) {
        return `Decryption failed: ${err instanceof Error ? err.message : String(err)}`
      }
    } else {
      data = payload as Record<string, unknown>
    }

    if (!data.eventName || !Array.isArray(data.categories) || !Array.isArray(data.guests)) {
      return 'Backup data is missing required fields'
    }
    return {
      eventName: data.eventName as string,
      categories: data.categories as unknown[],
      guests: data.guests as unknown[],
      orders: (data.orders ?? []) as unknown[],
      payments: (data.payments ?? []) as unknown[],
    }
  } catch (err) {
    return `Network error: ${err instanceof Error ? err.message : String(err)}`
  }
}

/** Test cloud backup connectivity. Returns true if successful. */
export async function testCloudBackup(): Promise<{ ok: boolean; error?: string }> {
  const { cloudBackupUrl, cloudBackupSecret } = useStore.getState()
  if (!cloudBackupUrl) return { ok: false, error: 'No backup URL configured' }
  if (!cloudBackupSecret) return { ok: false, error: 'No backup secret configured' }

  try {
    const res = await fetch(`${cloudBackupUrl}/backup`, {
      method: 'GET',
      headers: { 'X-Backup-Secret': cloudBackupSecret },
    })
    // 404 is fine — means no backup yet but connection works
    if (res.ok || res.status === 404) return { ok: true }
    if (res.status === 401) return { ok: false, error: 'Invalid secret' }
    return { ok: false, error: `Server returned ${res.status}` }
  } catch (err) {
    return { ok: false, error: 'Could not connect to backup server' }
  }
}

/**
 * Run cloud backup.
 * Cloud backup is encrypted with AES-256-GCM before leaving the device.
 */
export function autoBackup() {
  cloudBackup()
}
