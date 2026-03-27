import { useState } from 'react'
import { CheckCircle2, ChevronRight, Users } from 'lucide-react'
import { useStore } from '../../store'
import type { Guest } from '../../types'
import { formatPrice } from '../../utils/formatPrice'
import { TabDetail } from './TabDetail'

export function GuestOverview() {
  const { guests, getEventTotal, getGuestTotal } = useStore()
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)

  const sorted = [...guests].sort((a, b) => a.name.localeCompare(b.name))
  const outstandingGuests = sorted.filter((g) => !g.paid && getGuestTotal(g.id) > 0)
  const noPaymentGuests  = sorted.filter((g) => !g.paid && getGuestTotal(g.id) === 0)
  const paidGuests       = sorted.filter((g) => g.paid)
  const eventTotal = getEventTotal()

  if (selectedGuest) {
    const freshGuest = guests.find((g) => g.id === selectedGuest.id) ?? selectedGuest
    return (
      <TabDetail
        guest={freshGuest}
        onBack={() => setSelectedGuest(null)}
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Summary bar */}
      <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-6 shrink-0 bg-gray-50">
        <div className="flex items-center gap-2 text-gray-500">
          <Users size={16} />
          <span className="text-sm">{guests.length} guests</span>
        </div>
        <div className="text-sm text-gray-500">
          <span className="text-orange-500 font-medium">{outstandingGuests.length}</span> outstanding ·{' '}
          <span className="text-green-600 font-medium">{paidGuests.length}</span> paid
        </div>
        <div className="ml-auto text-sm text-gray-500">
          Outstanding: <span className="text-gray-900 font-bold text-base">{formatPrice(eventTotal)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {guests.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
            <Users size={40} />
            <p className="text-gray-400">No guests yet. Add them in Setup.</p>
          </div>
        )}

        {/* Outstanding */}
        {outstandingGuests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3">Outstanding</h3>
            <div className="flex flex-col gap-2">
              {outstandingGuests.map((guest) => (
                <GuestRow key={guest.id} guest={guest} onClick={() => setSelectedGuest(guest)} />
              ))}
            </div>
          </div>
        )}

        {/* No payment needed */}
        {noPaymentGuests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">No Payment Needed</h3>
            <div className="flex flex-col gap-2">
              {noPaymentGuests.map((guest) => (
                <GuestRow key={guest.id} guest={guest} onClick={() => setSelectedGuest(guest)} />
              ))}
            </div>
          </div>
        )}

        {/* Paid */}
        {paidGuests.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">Paid</h3>
            <div className="flex flex-col gap-2">
              {paidGuests.map((guest) => (
                <GuestRow key={guest.id} guest={guest} onClick={() => setSelectedGuest(guest)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GuestRow({ guest, onClick }: { guest: Guest; onClick: () => void }) {
  const { getGuestTotal } = useStore()
  const total = getGuestTotal(guest.id)

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-colors w-full border ${
        guest.paid
          ? 'bg-gray-50 border-gray-100 opacity-60 hover:opacity-80'
          : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm'
      }`}
    >
      {guest.paid ? (
        <CheckCircle2 size={20} className="text-green-500 shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
      )}
      <span className={`flex-1 font-medium ${guest.paid ? 'text-gray-400' : 'text-gray-900'}`}>
        {guest.name}
      </span>
      <span className={`font-bold text-lg ${guest.paid ? 'text-gray-400' : 'text-green-600'}`}>
        {formatPrice(total)}
      </span>
      <ChevronRight size={18} className="text-gray-300 shrink-0" />
    </button>
  )
}
