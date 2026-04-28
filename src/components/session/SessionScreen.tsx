import { useEffect, useMemo, useState } from 'react'
import { DoorOpen, UserPlus } from 'lucide-react'
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

  const active = useMemo(
    () => visitors.filter((v) => !v.deleted && !v.exitedAt).sort((a, b) => a.enteredAt - b.enteredAt),
    [visitors]
  )

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

      {/* Active visitor list */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto">
          {active.length === 0 ? (
            <div className="text-center text-gray-400 py-16 px-6">
              <DoorOpen size={32} className="mx-auto mb-3 text-gray-300" />
              <div className="font-medium">No one is inside yet</div>
              <div className="text-sm mt-1">Tap “Add visitor” to check someone in.</div>
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
