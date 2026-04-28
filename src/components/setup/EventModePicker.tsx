import { useState } from 'react'
import { Coffee, DoorOpen } from 'lucide-react'
import { useStore } from '../../store'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { EventMode } from '../../types'

export function EventModePicker() {
  const eventMode = useStore((s) => s.eventMode)
  const setEventMode = useStore((s) => s.setEventMode)
  const orders = useStore((s) => s.orders)
  const guests = useStore((s) => s.guests)
  const payments = useStore((s) => s.payments)
  const visitors = useStore((s) => s.visitors)

  const [pendingSwitch, setPendingSwitch] = useState<EventMode | null>(null)

  function attemptSwitch(target: EventMode) {
    if (eventMode === target) return
    if (eventMode === null) {
      setEventMode(target)
      return
    }
    // We're switching from one mode to another — check if there's data to lose
    const hasBrunchData = orders.length > 0 || guests.length > 0 || payments.length > 0
    const hasSessionData = visitors.length > 0
    const wouldLoseData =
      (eventMode === 'brunch' && hasBrunchData) ||
      (eventMode === 'session' && hasSessionData)
    if (wouldLoseData) {
      setPendingSwitch(target)
    } else {
      setEventMode(target)
    }
  }

  const cardBase =
    'flex-1 text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.99] min-h-[112px]'
  const cardActive = (color: 'green' | 'amber') =>
    color === 'amber'
      ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-200'
      : 'border-green-600 bg-green-50 text-green-900 ring-2 ring-green-200'
  const cardInactive = 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'

  return (
    <div className="border-b border-gray-200 px-6 py-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Event mode</h3>
      <p className="text-xs text-gray-400 mb-3">
        {eventMode
          ? 'Switching mode clears the current mode’s per-event data. The menu and entry-fee config are kept.'
          : 'Pick how this event runs. You’ll be able to switch later.'}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
        <button
          onClick={() => attemptSwitch('session')}
          className={`${cardBase} ${eventMode === 'session' ? cardActive('amber') : cardInactive}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <DoorOpen size={18} className={eventMode === 'session' ? 'text-amber-600' : 'text-gray-400'} />
            <div className="font-bold text-base">Session</div>
          </div>
          <div className="text-sm">Time-based entry fee, no bar tab.</div>
        </button>

        <button
          onClick={() => attemptSwitch('brunch')}
          className={`${cardBase} ${eventMode === 'brunch' ? cardActive('green') : cardInactive}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Coffee size={18} className={eventMode === 'brunch' ? 'text-green-700' : 'text-gray-400'} />
            <div className="font-bold text-base">Brunch</div>
          </div>
          <div className="text-sm">Track drinks per guest, settle bar tabs at the end.</div>
        </button>
      </div>

      {pendingSwitch && (
        <ConfirmDialog
          title={`Switch to ${pendingSwitch === 'session' ? 'Session' : 'Brunch'} mode?`}
          message={
            eventMode === 'brunch'
              ? 'This will clear all current brunch data (guests, orders, payments). The menu is kept.'
              : 'This will clear all current session visitors. The entry-fee config is kept.'
          }
          confirmLabel="Switch mode"
          variant="danger"
          onConfirm={() => {
            setEventMode(pendingSwitch)
            setPendingSwitch(null)
          }}
          onCancel={() => setPendingSwitch(null)}
        />
      )}
    </div>
  )
}
