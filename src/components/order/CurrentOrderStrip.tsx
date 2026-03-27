import { useStore } from '../../store'
import { formatPrice } from '../../utils/formatPrice'
import type { CartItem } from '../../types'

function groupByGuest(cart: CartItem[]): Map<string, CartItem[]> {
  const map = new Map<string, CartItem[]>()
  for (const item of cart) {
    if (!map.has(item.guestId)) map.set(item.guestId, [])
    map.get(item.guestId)!.push(item)
  }
  return map
}

export function CurrentOrderStrip() {
  const { cart, guests, clearCart } = useStore()
  const isEmpty = cart.length === 0
  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const guestMap = new Map(guests.map((g) => [g.id, g.name]))
  const groups = groupByGuest(cart)

  return (
    <div
      className={`px-5 py-3 border-b shrink-0 transition-colors ${
        isEmpty ? 'bg-white border-gray-200' : 'bg-green-50 border-green-200'
      }`}
    >
      <div className="flex gap-4">
        {/* Label */}
        <span className={`text-xs font-semibold uppercase tracking-wider shrink-0 mt-0.5 ${isEmpty ? 'text-gray-400' : 'text-green-700'}`}>
          Current Order
        </span>

        {/* Grouped content */}
        <div className="flex-1 min-w-0">
          {isEmpty ? (
            <span className="text-gray-400 text-sm italic">No current order</span>
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from(groups.entries()).map(([guestId, items]) => (
                <div key={guestId}>
                  <p className="text-green-800 font-semibold text-sm leading-snug">
                    {guestMap.get(guestId) ?? 'Unknown'}
                  </p>
                  {items.map((i) => (
                    <p key={i.drinkId} className="text-green-700 text-sm leading-snug pl-3">
                      {i.drinkName} ×{i.quantity}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total & Done */}
        {!isEmpty && (
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <span className="text-green-800 font-bold text-base">{formatPrice(total)}</span>
            <button
              onClick={clearCart}
              className="bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-green-700 active:scale-95 transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
