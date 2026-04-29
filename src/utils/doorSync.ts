import type { EntryFeeConfig, Visitor } from '../types'
import { useStore } from '../store'

export interface SyncResult {
  ok: true
  visitors: Visitor[]
  entryFeeConfig: EntryFeeConfig | null
  serverTime: number
}

export type SyncFailure = { ok: false; error: string }

/**
 * Push the current local visitor list AND the local entryFeeConfig to the
 * worker, get the merged result back. Single round-trip for both push and
 * pull. The worker decides per-record whether to accept incoming visitors
 * (by updatedAt) and whether to replace the stored config (by lastModifiedAt).
 */
export async function syncDoor(): Promise<SyncResult | SyncFailure> {
  const { cloudBackupUrl: rawUrl, cloudBackupSecret, visitors, entryFeeConfig } = useStore.getState()
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
      body: JSON.stringify({ visitors, entryFeeConfig }),
    })

    if (res.status === 401) return { ok: false, error: 'Invalid sync secret' }
    if (!res.ok) return { ok: false, error: `Server error ${res.status}` }

    const data = (await res.json()) as {
      visitors?: Visitor[]
      entryFeeConfig?: EntryFeeConfig | null
      serverTime?: number
    }
    if (!Array.isArray(data.visitors) || typeof data.serverTime !== 'number') {
      return { ok: false, error: 'Bad response shape' }
    }
    return {
      ok: true,
      visitors: data.visitors,
      entryFeeConfig: data.entryFeeConfig ?? null,
      serverTime: data.serverTime,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
