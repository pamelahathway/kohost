import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store'
import { calculateVisitorFee, formatDuration } from '../../utils/sessionFee'
import { formatPrice } from '../../utils/formatPrice'
import { Card } from './Card'

const NO_TIERS: never[] = []

export function SessionDashboard() {
  const visitors = useStore((s) => s.visitors)
  const tiers = useStore((s) => s.entryFeeConfig?.tiers ?? NO_TIERS)

  const [now, setNow] = useState(Date.now())
  // Tick every minute so "Owed now" stays current
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const stats = useMemo(() => {
    const live = visitors.filter((v) => !v.deleted)
    const totalVisitors = live.length
    const active = live.filter((v) => !v.exitedAt)
    const paid = live.filter((v) => v.paidAmount !== null)

    const revenue = paid.reduce((sum, v) => sum + (v.paidAmount ?? 0), 0)
    const owedNow = active.reduce(
      (sum, v) => sum + calculateVisitorFee(v, now, { tiers }),
      0
    )

    // Bucket each visitor by stay duration into the matching tier.
    // For active visitors use (now - enteredAt); for completed use (exitedAt - enteredAt).
    type Bucket = { tierId: string; label: string; priceCents: number; count: number; revenueCents: number }
    const buckets: Bucket[] = tiers.map((t) => ({
      tierId: t.id,
      label: `${t.minStart}–${t.minEnd}m`,
      priceCents: t.priceCents,
      count: 0,
      revenueCents: 0,
    }))

    let untieredCount = 0
    for (const v of live) {
      const endTime = v.exitedAt ?? now
      const minutes = (endTime - v.enteredAt) / 60000
      const matchedIdx = tiers.findIndex((t) => minutes >= t.minStart && minutes < t.minEnd)
      if (matchedIdx === -1) {
        untieredCount += 1
        continue
      }
      const bucket = buckets[matchedIdx]
      bucket.count += 1
      // Revenue: use actual paidAmount if paid, otherwise the tier's price (projected)
      bucket.revenueCents += v.paidAmount ?? tiers[matchedIdx].priceCents
    }

    // Average completed stay duration (for the "Inside" tile context)
    const completed = live.filter((v) => v.exitedAt)
    const avgMinutes = completed.length === 0
      ? 0
      : completed.reduce((sum, v) => sum + (v.exitedAt! - v.enteredAt), 0) / completed.length / 60000

    return { totalVisitors, activeCount: active.length, paidCount: paid.length, revenue, owedNow, buckets, untieredCount, avgMinutes }
  }, [visitors, tiers, now])

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="Visitors">
            <span className="text-3xl font-black text-gray-900">{stats.totalVisitors}</span>
            <span className="text-xs text-gray-400 mt-0.5">
              {stats.paidCount} paid · {stats.activeCount} inside
            </span>
          </Card>
          <Card label="Inside">
            <span className="text-3xl font-bold text-gray-900">{stats.activeCount}</span>
            {stats.avgMinutes > 0 && (
              <span className="text-xs text-gray-400 mt-0.5">
                avg stay {formatDuration(stats.avgMinutes)}
              </span>
            )}
          </Card>
          <Card label="Revenue">
            <span className="text-3xl font-bold text-green-600">{formatPrice(stats.revenue)}</span>
            <span className="text-xs text-gray-400 mt-0.5">
              from {stats.paidCount} paid visit{stats.paidCount !== 1 ? 's' : ''}
            </span>
          </Card>
          <Card label="Owed now">
            <span className="text-3xl font-bold text-amber-600">{formatPrice(stats.owedNow)}</span>
            <span className="text-xs text-gray-400 mt-0.5">
              if everyone left now
            </span>
          </Card>
        </div>

        {/* Visitors by tier */}
        <Card label="Visitors by tier">
          {tiers.length === 0 ? (
            <span className="text-gray-400 text-sm">Configure tiers in Setup to see this breakdown.</span>
          ) : stats.totalVisitors === 0 ? (
            <span className="text-gray-400 text-sm">No visitors yet.</span>
          ) : (
            <div className="space-y-2 mt-1">
              {(() => {
                const max = Math.max(...stats.buckets.map((b) => b.count), 1)
                return stats.buckets.map((b) => (
                  <div key={b.tierId} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 font-medium w-32 shrink-0 truncate">
                      {b.label} · {b.priceCents === 0 ? 'free' : formatPrice(b.priceCents)}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      {b.count > 0 && (
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${Math.max((b.count / max) * 100, 2)}%` }}
                        />
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right shrink-0">
                      {b.count}
                    </span>
                    <span className="text-xs text-gray-500 w-16 text-right shrink-0">
                      {b.revenueCents === 0 ? '—' : formatPrice(b.revenueCents)}
                    </span>
                  </div>
                ))
              })()}
              {stats.untieredCount > 0 && (
                <div className="text-xs text-gray-400 mt-2">
                  {stats.untieredCount} visitor{stats.untieredCount !== 1 ? 's' : ''} fell outside any configured tier.
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
