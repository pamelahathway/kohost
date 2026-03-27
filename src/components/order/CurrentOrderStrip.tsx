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
  const { cart, guests } = useStore()
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
      {/* Label */}
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-semibold uppercase tracking-wider ${isEmpty ? 'text-gray-400' : 'text-green-700'}`}>
          Current Order
        </span>
        {!isEmpty && (
          <span className="text-green-800 font-bold text-base">{formatPrice(total)}</span>
        )}
      </div>

      {/* Items underneath */}
      {isEmpty ? (
        <span className="text-gray-400 text-sm italic">No current order</span>
      ) : (
        <div className="flex flex-col gap-1.5">
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
  )
}
