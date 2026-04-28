import { useEffect, useState } from 'react'
import { useStore } from '../../store'

function formatAge(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 5) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  return `${hr}h ago`
}

export function SyncIndicator() {
  const cloudBackupUrl = useStore((s) => s.cloudBackupUrl)
  const cloudBackupSecret = useStore((s) => s.cloudBackupSecret)
  const syncStatus = useStore((s) => s.syncStatus)
  const lastSyncedAt = useStore((s) => s.lastSyncedAt)
  const syncError = useStore((s) => s.syncError)

  // Tick every 10s so the "synced Xs ago" text stays fresh
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  if (!cloudBackupUrl || !cloudBackupSecret) {
    return (
      <div className="text-xs text-gray-400 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300" />
        Sync off — set Worker URL in Setup
      </div>
    )
  }

  if (syncStatus === 'syncing') {
    return (
      <div className="text-xs text-gray-500 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Syncing…
      </div>
    )
  }

  if (syncStatus === 'error') {
    return (
      <div className="text-xs text-red-600 flex items-center gap-1.5" title={syncError ?? ''}>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
        Sync error
      </div>
    )
  }

  if (lastSyncedAt) {
    return (
      <div className="text-xs text-gray-500 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
        Synced {formatAge(Date.now() - lastSyncedAt)}
      </div>
    )
  }

  return (
    <div className="text-xs text-gray-400 flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300" />
      Waiting for first sync
    </div>
  )
}
