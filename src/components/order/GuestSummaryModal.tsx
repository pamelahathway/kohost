import { useEffect } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useStore } from '../../store'
import { formatPrice } from '../../utils/formatPrice'
import type { Guest } from '../../types'

interface Props {
  guest: Guest
  onClose: () => void
}

export function GuestSummaryModal({ guest, onClose }: Props) {
  const { cart, orders, payments, categories } = useStore()

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Current session items for this guest (from cart)
  const currentItems = cart.filter((i) => i.guestId === guest.id)
  const currentTotal = currentItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  // All drinks lookup (for unpaid orders)
  const allDrinks = categories.flatMap((c) => c.drinks.map((d) => ({ ...d, categoryName: c.name })))

  // Unpaid committed orders for this guest
  const unpaidItems = orders
    .filter((o) => o.guestId === guest.id && o.quantity > 0)
    .map((o) => {
      const drink = allDrinks.find((d) => d.id === o.drinkId)
      return {
        key: o.drinkId,
        drinkName: drink?.name ?? 'Unknown',
        quantity: o.quantity,
        unitPrice: drink?.price ?? 0,
        lineTotal: (drink?.price ?? 0) * o.quantity,
        paid: false,
      }
    })

  // Paid items from payment history
  const paidItems = payments
    .filter((p) => p.guestId === guest.id)
    .flatMap((p, pi) =>
      p.items.map((item, ii) => ({
        key: `paid-${pi}-${ii}`,
        drinkName: item.drinkName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        paid: true,
      }))
    )

  const allItems = [...unpaidItems, ...paidItems]
  const outstandingTotal = unpaidItems.reduce((s, i) => s + i.lineTotal, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[440px] max-h-[85vh] flex flex-col mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="p-2 -ml-1 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={22} />
          </button>
          <span className="flex-1 text-center font-semibold text-gray-900">{guest.name}</span>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Current Order */}
          <div className="px-5 pt-4 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Current Order</p>
            {currentItems.length === 0 ? (
              <p className="text-gray-400 text-sm italic">Nothing in current order</p>
            ) : (
              <div className="flex flex-col gap-1">
                {currentItems.map((item) => (
                  <div key={item.drinkId} className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-green-700 w-6 text-right shrink-0">×{item.quantity}</span>
                    <span className="flex-1 text-green-900">{item.drinkName}</span>
                    <span className="text-green-700 font-medium shrink-0">{formatPrice(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-end mt-1.5 pt-1.5 border-t border-green-100">
                  <span className="text-green-700 font-bold text-sm">{formatPrice(currentTotal)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mx-5 border-t border-gray-100" />

          {/* All Orders */}
          <div className="px-5 pt-3 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">All Orders (incl. current order)</p>
            {allItems.length === 0 ? (
              <p className="text-gray-400 text-sm italic py-2">No orders yet</p>
            ) : (
              <>
                <div className="flex flex-col divide-y divide-gray-100">
                  {allItems.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 py-2.5 text-sm">
                      {/* Paid indicator */}
                      <div className="w-5 shrink-0 flex justify-center">
                        {item.paid ? (
                          <Check size={15} className="text-green-600" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                      <span className={`flex-1 ${item.paid ? 'text-gray-400' : 'text-gray-900'}`}>
                        {item.drinkName}
                      </span>
                      <span className={`text-sm shrink-0 ${item.paid ? 'text-gray-400' : 'text-gray-500'}`}>
                        ×{item.quantity}
                      </span>
                      <span className={`font-medium w-16 text-right shrink-0 ${item.paid ? 'text-gray-400' : 'text-gray-700'}`}>
                        {formatPrice(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 pt-2.5 border-t border-gray-200">
                  <span className="text-sm text-gray-500 font-medium">Total (outstanding)</span>
                  <span className="font-bold text-gray-900 text-sm">{formatPrice(outstandingTotal)}</span>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
