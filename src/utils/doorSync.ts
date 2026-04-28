import type { Visitor } from '../types'
import { useStore } from '../store'

export interface SyncResult {
  ok: true
  visitors: Visitor[]
  serverTime: number
}

export type SyncFailure = { ok: false; error: string }

/**
 * Push the current local visitor list to the worker, get the merged result back.
 * The PUT response includes the merged blob so we can do push+pull in a single
 * round-trip. On failure, returns an error string for the UI.
 */
export async function syncDoor(): Promise<SyncResult | SyncFailure> {
  const { cloudBackupUrl: rawUrl, cloudBackupSecret, visitors } = useStore.getState()
  const cloudBackupUrl = rawUrl.replace(/\/+$/, '')
  if (!cloudBackupUrl || !cloudBackupSecret) {
    return { ok: false, error: 'Cloud sync not configured' }
  }

  try {
    const res = await fetch(`${cloudBackupUrl}/door`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Backup-Secret': cloudBackupSecret,
      },
      body: JSON.stringify({ visitors }),
    })

    if (res.status === 401) return { ok: false, error: 'Invalid sync secret' }
    if (!res.ok) return { ok: false, error: `Server error ${res.status}` }

    const data = (await res.json()) as { visitors?: Visitor[]; serverTime?: number }
    if (!Array.isArray(data.visitors) || typeof data.serverTime !== 'number') {
      return { ok: false, error: 'Bad response shape' }
    }
    return { ok: true, visitors: data.visitors, serverTime: data.serverTime }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
