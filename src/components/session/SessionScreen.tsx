import { useEffect, useMemo, useState } from 'react'
import { DoorOpen, Sparkles, UserPlus } from 'lucide-react'
import { useStore } from '../../store'
import { calculateVisitorFee, formatDuration, formatTimeOfDay } from '../../utils/sessionFee'
import { formatPrice } from '../../utils/formatPrice'
import { ModeEmptyState } from '../shared/ModeEmptyState'
import { CheckInSheet } from './CheckInSheet'
import { CheckOutSheet } from './CheckOutSheet'
import { SyncIndicator } from './SyncIndicator'

export function SessionScreen() {
  const visitors = useStore((s) => s.visitors)
  const config = useStore((s) => s.entryFeeConfig)
  const eventMode = useStore((s) => s.eventMode)

  const [now, setNow] = useState(Date.now())
  const [sheetVisitorId, setSheetVisitorId] = useState<string | null>(null)
  const [showCheckIn, setShowCheckIn] = useState(false)

  // Tick every 15s so durations and tier prices stay current
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  const { active, paid } = useMemo(() => {
    const live = visitors.filter((v) => !v.deleted)
    return {
      active: live
        .filter((v) => !v.exitedAt)
        .sort((a, b) => a.enteredAt - b.enteredAt),
      paid: live
        .filter((v) => v.exitedAt)
        .sort((a, b) => (b.exitedAt ?? 0) - (a.exitedAt ?? 0)), // most recent exit first
    }
  }, [visitors])

  const totalOwed = active.reduce((sum, v) => sum + calculateVisitorFee(v, now, config), 0)

  if (eventMode !== 'session') {
    return (
      <ModeEmptyState
        icon={<DoorOpen size={40} />}
        title={eventMode === 'brunch' ? 'This event is in Brunch mode' : 'No session in progress'}
        description={
          eventMode === 'brunch'
            ? 'Switch to Session in Setup to check visitors in.'
            : 'Choose Session in Setup to start checking visitors in.'
        }
        accent="amber"
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Stats bar */}
      <div className="border-b border-gray-200 px-5 py-3 grid grid-cols-2 gap-3 shrink-0 max-w-2xl w-full mx-auto">
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-400">Inside</div>
          <div className="text-2xl font-bold text-gray-900">{active.length}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-gray-400">Owed now</div>
          <div className="text-2xl font-bold text-amber-600">{formatPrice(totalOwed)}</div>
        </div>
      </div>

      {/* Add visitor button — stays pinned above the scrolling list */}
      <div className="px-5 pt-3 pb-3 border-b border-gray-200 shrink-0 max-w-2xl w-full mx-auto">
        <div className="flex justify-end mb-1.5">
          <SyncIndicator />
        </div>
        <button
          onClick={() => setShowCheckIn(true)}
          className="w-full bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white font-semibold rounded-xl py-3 text-base transition min-h-[48px] flex items-center justify-center gap-2"
        >
          <UserPlus size={18} />
          Add visitor
        </button>
      </div>

      {/* Visitor lists */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto">
          {/* Inside section */}
          <SectionHeader label="Inside" count={active.length} />
          {active.length === 0 ? (
            <div className="text-center text-gray-400 py-10 px-6">
              <DoorOpen size={28} className="mx-auto mb-2 text-gray-300" />
              <div className="text-sm">No one is inside.</div>
            </div>
          ) : (
            active.map((v) => {
              const fee = calculateVisitorFee(v, now, config)
              const minutes = (now - v.enteredAt) / 60000
              return (
                <button
                  key={v.id}
                  onClick={() => setSheetVisitorId(v.id)}
                  className="w-full flex items-center gap-3 px-5 py-3 border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 text-left min-h-[64px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{v.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      in {formatTimeOfDay(v.enteredAt)} · {formatDuration(minutes)}
                    </div>
                  </div>
                  <div className={`text-lg font-bold shrink-0 ${fee === 0 ? 'text-gray-400' : 'text-amber-600'}`}>
                    {fee === 0 ? 'free' : formatPrice(fee)}
                  </div>
                </button>
              )
            })
          )}

          {/* Paid section — visually distinct from Inside: vertical gap above,
              muted row colours so it reads as "done". KoHo badge keeps full
              colour so it still pops. */}
          {paid.length > 0 && (
            <div className="mt-6 border-t-4 border-gray-100">
              <SectionHeader label="Paid" count={paid.length} />
              {paid.map((v) => {
                const exitedAt = v.exitedAt ?? Date.now()
                const stayMin = (exitedAt - v.enteredAt) / 60000
                const amount = v.paidAmount ?? 0
                return (
                  <div
                    key={v.id}
                    className="w-full flex items-center gap-3 px-5 py-3 border-b border-gray-100 min-h-[64px] bg-gray-50/60"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-gray-500 truncate">{v.name}</span>
                        {v.kohoFriend && <KohoBadge />}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatTimeOfDay(v.enteredAt)} → {formatTimeOfDay(exitedAt)} · {formatDuration(stayMin)}
                      </div>
                    </div>
                    <div className="text-base font-semibold text-gray-400 shrink-0">
                      {amount === 0 ? 'free' : formatPrice(amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* spacer at the bottom so last row isn't cut off on phones with home indicator */}
          <div className="h-6" />
        </div>
      </div>

      {showCheckIn && <CheckInSheet onClose={() => setShowCheckIn(false)} />}
      {sheetVisitorId && (
        <CheckOutSheet
          visitorId={sheetVisitorId}
          onClose={() => setSheetVisitorId(null)}
        />
      )}
    </div>
  )
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="px-5 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold text-gray-400">{count}</span>
    </div>
  )
}

function KohoBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0">
      <Sparkles size={10} />
      KoHo
    </span>
  )
}
