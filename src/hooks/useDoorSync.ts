import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { syncDoor } from '../utils/doorSync'
import type { AppTab } from '../types'

const FAST_INTERVAL_MS = 5_000   // when Session tab is active
const SLOW_INTERVAL_MS = 30_000  // background

/**
 * Polls the worker /door endpoint to push local visitor changes and pull
 * remote ones. No-op unless eventMode==='session' AND cloud sync is configured.
 *
 * Cadence: 5s while the Session tab is active, 30s otherwise. The push+pull
 * happens in a single PUT round-trip — we always send the entire local list,
 * and the response carries the merged blob.
 */
export function useDoorSync(currentTab: AppTab) {
  const eventMode = useStore((s) => s.eventMode)
  const cloudBackupUrl = useStore((s) => s.cloudBackupUrl)
  const cloudBackupSecret = useStore((s) => s.cloudBackupSecret)

  // Use a ref to avoid restarting the timer on every visitors change
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (eventMode !== 'session') return
    if (!cloudBackupUrl || !cloudBackupSecret) return

    const interval = currentTab === 'session' ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS

    async function tick() {
      if (inFlightRef.current) return
      inFlightRef.current = true
      const { setSyncStatus, mergeRemoteVisitors, mergeRemoteEntryFeeConfig, markSynced } = useStore.getState()
      setSyncStatus('syncing')
      try {
        const result = await syncDoor()
        if (result.ok) {
          mergeRemoteVisitors(result.visitors)
          mergeRemoteEntryFeeConfig(result.entryFeeConfig)
          markSynced(Date.now())
        } else {
          setSyncStatus('error', result.error)
        }
      } finally {
        inFlightRef.current = false
      }
    }

    // Sync immediately on mount / dependency change, then on the cadence
    tick()
    const id = setInterval(tick, interval)
    return () => clearInterval(id)
  }, [eventMode, cloudBackupUrl, cloudBackupSecret, currentTab])
}
