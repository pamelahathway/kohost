import { useState } from 'react'
import { useStore } from '../../store'
import type { DrinkCategory, Guest } from '../../types'
import { renderIcon } from '../setup/IconPicker'
import { formatPrice } from '../../utils/formatPrice'
import { DrinkCategoryModal } from './DrinkCategoryModal'
import { GuestSummaryModal } from './GuestSummaryModal'
import { Users } from 'lucide-react'

export function DrinkGrid() {
  const { guests, categories, getCategoryCartCount, getCategoryCountForGuest, getGuestTotal, lastActiveGuestId, clearCart, cart } = useStore()
  const [modal, setModal] = useState<{ guest: Guest; category: DrinkCategory } | null>(null)
  const [summaryGuest, setSummaryGuest] = useState<Guest | null>(null)
  const [switchPrompt, setSwitchPrompt] = useState<{ guest: Guest; category: DrinkCategory } | null>(null)

  const sortedGuests = [...guests].sort((a, b) => a.name.localeCompare(b.name))
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)

  function handleCellClick(guest: Guest, category: DrinkCategory) {
    // If cart has items for a different guest, show the switch prompt
    if (cart.length > 0 && lastActiveGuestId && lastActiveGuestId !== guest.id) {
      setSwitchPrompt({ guest, category })
    } else {
      setModal({ guest, category })
    }
  }

  if (guests.length === 0 || categories.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
        <Users size={48} />
        <p className="text-gray-400 text-base">
          {guests.length === 0 ? 'Add guests in Setup to get started.' : 'Add drink categories in Setup to get started.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse table-fixed" style={{ minWidth: `${200 + sortedCategories.length * 100}px` }}>
          <colgroup>
            <col style={{ width: '192px' }} />
            {sortedCategories.map((cat) => (
              <col key={cat.id} />
            ))}
            <col style={{ width: '96px' }} />
            <col style={{ width: '80px' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 text-left px-5 py-3 text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-r border-gray-200 bg-gray-50">
                Guest
              </th>
              {sortedCategories.map((cat) => (
                <th
                  key={cat.id}
                  className="sticky top-0 z-10 px-2 py-3 border-b border-r border-gray-200 bg-gray-50 text-center"
                >
                  <span className="text-sm text-gray-500 font-medium truncate block">{cat.name}</span>
                </th>
              ))}
              <th className="sticky top-0 z-10 border-b border-r border-gray-200 bg-gray-50" />
              <th className="sticky top-0 z-10 px-4 py-3 text-right text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200 bg-gray-50">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedGuests.map((guest, guestIdx) => {
              const total = getGuestTotal(guest.id)
              const isEven = guestIdx % 2 === 0
              const isPaid = guest.paid
              const isActive = lastActiveGuestId === guest.id && cart.length > 0
              return (
                <tr
                  key={guest.id}
                  className={`${isEven ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  {/* Guest name — sticky left, clickable */}
                  <td className={`px-5 py-0 border-b border-r border-gray-200 sticky left-0 z-10 ${isEven ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <button
                      onClick={() => setSummaryGuest(guest)}
                      className={`font-medium text-sm text-left hover:underline active:opacity-70 transition-opacity ${isPaid ? 'text-gray-400 italic' : 'text-gray-900'}`}
                    >
                      {guest.name}
                    </button>
                  </td>

                  {/* Category cells */}
                  {sortedCategories.map((cat) => {
                    const cartCount = getCategoryCartCount(guest.id, cat.id)
                    const committedCount = getCategoryCountForGuest(guest.id, cat.id)
                    const inCurrentOrder = cartCount > 0
                    const hasOrders = committedCount > 0
                    return (
                      <td key={cat.id} className="border-b border-r border-gray-200 p-1 last:border-r-0">
                        <button
                          onClick={() => handleCellClick(guest, cat)}
                          className={`relative w-full min-h-[60px] rounded-xl flex items-center justify-center transition-colors ${
                            isPaid
                              ? 'opacity-30 hover:opacity-50 hover:bg-gray-50'
                              : inCurrentOrder
                                ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                : hasOrders
                                  ? 'text-gray-500 hover:bg-gray-100'
                                  : 'text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {renderIcon(cat.icon, 32)}
                          {committedCount > 0 && (
                            <span className={`absolute bottom-1 right-1 ${inCurrentOrder ? 'bg-green-600' : 'bg-gray-500'} text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center`}>
                              {committedCount}
                            </span>
                          )}
                        </button>
                      </td>
                    )
                  })}

                  {/* Done */}
                  <td className="border-b border-r border-gray-200 p-1">
                    {isActive && (
                      <button
                        onClick={() => clearCart()}
                        className="w-full min-h-[60px] rounded-xl px-3 text-sm font-medium bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all"
                      >
                        Done
                      </button>
                    )}
                  </td>

                  {/* Total */}
                  <td className="px-4 py-0 border-b border-gray-200 text-right">
                    <span className={`font-bold text-sm ${isPaid ? 'text-gray-400' : total > 0 ? 'text-green-700' : 'text-gray-300'}`}>
                      {formatPrice(total)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <DrinkCategoryModal
          guest={modal.guest}
          category={modal.category}
          onClose={() => setModal(null)}
        />
      )}

      {summaryGuest && (
        <GuestSummaryModal
          guest={summaryGuest}
          onClose={() => setSummaryGuest(null)}
        />
      )}

      {/* Switch-guest prompt */}
      {switchPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 mx-4 p-6 flex flex-col gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-base mb-1">New order?</h3>
              <p className="text-gray-500 text-sm">
                There's an open order. Do you want to add to it, or clear it and start fresh for{' '}
                <span className="font-medium text-gray-800">{switchPrompt.guest.name}</span>?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setModal(switchPrompt); setSwitchPrompt(null) }}
                className="w-full px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Add to current order
              </button>
              <button
                onClick={() => { clearCart(); setModal(switchPrompt); setSwitchPrompt(null) }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Clear &amp; start new order
              </button>
              <button
                onClick={() => setSwitchPrompt(null)}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
