import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
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
      (sum, v) => sum + calculateVisitorFee(v, now, { tiers, lastModifiedAt: 0 }),
      0
    )

    // Bucket each visitor by stay duration into the matching tier.
    // KoHo Friends are pulled out into their own bucket regardless of stay
    // length so they don't get lost in the breakdown. Each bucket tracks
    // paid + inside separately so the bar can be stacked.
    type Bucket = {
      tierId: string
      label: string
      priceCents: number
      paidCount: number
      insideCount: number
      revenueCents: number
    }
    const buckets: Bucket[] = tiers.map((t) => ({
      tierId: t.id,
      label: `${t.minStart}–${t.minEnd}m`,
      priceCents: t.priceCents,
      paidCount: 0,
      insideCount: 0,
      revenueCents: 0,
    }))

    const koho = { paidCount: 0, insideCount: 0, revenueCents: 0 }
    let untieredCount = 0

    for (const v of live) {
      const isPaid = v.paidAmount !== null
      if (v.kohoFriend) {
        if (isPaid) koho.paidCount += 1
        else koho.insideCount += 1
        koho.revenueCents += v.paidAmount ?? 0
        continue
      }
      const endTime = v.exitedAt ?? now
      const minutes = (endTime - v.enteredAt) / 60000
      const matchedIdx = tiers.findIndex((t) => minutes >= t.minStart && minutes < t.minEnd)
      if (matchedIdx === -1) {
        untieredCount += 1
        continue
      }
      const bucket = buckets[matchedIdx]
      if (isPaid) bucket.paidCount += 1
      else bucket.insideCount += 1
      bucket.revenueCents += v.paidAmount ?? 0
    }

    // Average completed stay duration (for the "Inside" tile context)
    const completed = live.filter((v) => v.exitedAt)
    const avgMinutes = completed.length === 0
      ? 0
      : completed.reduce((sum, v) => sum + (v.exitedAt! - v.enteredAt), 0) / completed.length / 60000

    return {
      totalVisitors,
      activeCount: active.length,
      paidCount: paid.length,
      revenue,
      owedNow,
      buckets,
      koho,
      untieredCount,
      avgMinutes,
    }
  }, [visitors, tiers, now])

  // Bar widths normalised across tier buckets + KoHo bucket so they're comparable.
  // Use total (paid + inside) per bucket as the basis.
  const bucketTotal = (b: { paidCount: number; insideCount: number }) =>
    b.paidCount + b.insideCount
  const maxBucketCount = Math.max(
    ...stats.buckets.map(bucketTotal),
    bucketTotal(stats.koho),
    1
  )

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
              {stats.koho.paidCount > 0
                ? `${stats.koho.paidCount} KoHo · ${formatPrice(stats.koho.revenueCents)}`
                : `from ${stats.paidCount} paid visit${stats.paidCount !== 1 ? 's' : ''}`}
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
            <div className="mt-1">
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" />
                  paid
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  inside
                </span>
              </div>

              <div className="space-y-2">
                {stats.buckets.map((b) => (
                  <BarRow
                    key={b.tierId}
                    label={`${b.label} · ${b.priceCents === 0 ? 'free' : formatPrice(b.priceCents)}`}
                    paidCount={b.paidCount}
                    insideCount={b.insideCount}
                    revenueCents={b.revenueCents}
                    maxCount={maxBucketCount}
                  />
                ))}
                {(stats.koho.paidCount > 0 || stats.koho.insideCount > 0) && (
                  <div className="pt-2 mt-2 border-t border-gray-100">
                    <BarRow
                      label="KoHo Friends"
                      labelIcon={<Sparkles size={12} className="text-gray-900" />}
                      labelBold
                      paidCount={stats.koho.paidCount}
                      insideCount={stats.koho.insideCount}
                      revenueCents={stats.koho.revenueCents}
                      maxCount={maxBucketCount}
                    />
                  </div>
                )}
              </div>

              {stats.untieredCount > 0 && (
                <div className="text-xs text-gray-400 mt-3">
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

function BarRow({
  label,
  labelIcon,
  labelBold,
  paidCount,
  insideCount,
  revenueCents,
  maxCount,
}: {
  label: string
  labelIcon?: React.ReactNode
  labelBold?: boolean
  paidCount: number
  insideCount: number
  revenueCents: number
  maxCount: number
}) {
  // Each segment's width is (count / maxCount) * 100, so the total bar length
  // reflects the bucket's size relative to the busiest bucket.
  const paidPct = (paidCount / maxCount) * 100
  const insidePct = (insideCount / maxCount) * 100
  return (
    <div className="flex items-center gap-3">
      <span
        className={`text-sm w-32 shrink-0 truncate flex items-center gap-1 ${
          labelBold ? 'text-gray-900 font-semibold' : 'text-gray-700 font-medium'
        }`}
      >
        {labelIcon}
        {label}
      </span>
      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden flex">
        {paidCount > 0 && (
          <div
            className="h-full bg-green-500"
            style={{ width: `${paidPct}%` }}
            title={`${paidCount} paid`}
          />
        )}
        {insideCount > 0 && (
          <div
            className="h-full bg-amber-500"
            style={{ width: `${insidePct}%` }}
            title={`${insideCount} inside`}
          />
        )}
      </div>
      <div className="flex items-baseline justify-end gap-1 w-16 shrink-0">
        <span className="text-sm font-bold text-green-600">{paidCount}</span>
        <span className="text-xs text-gray-300">·</span>
        <span className="text-sm font-bold text-amber-600">{insideCount}</span>
      </div>
      <span className="text-xs text-gray-500 w-16 text-right shrink-0">
        {revenueCents === 0 ? '—' : formatPrice(revenueCents)}
      </span>
    </div>
  )
}
