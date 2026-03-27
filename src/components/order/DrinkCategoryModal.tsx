import { useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { DrinkCategory, Guest } from '../../types'
import { useStore } from '../../store'
import { formatPrice } from '../../utils/formatPrice'
import { renderIcon } from '../setup/IconPicker'

interface DrinkCategoryModalProps {
  guest: Guest
  category: DrinkCategory
  onClose: () => void
}

export function DrinkCategoryModal({ guest, category, onClose }: DrinkCategoryModalProps) {
  const { cart, addDrinkToGuest, removeDrinkFromGuest } = useStore()

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Only count what's in the current order (cart) for this guest+category
  const categoryTotal = category.drinks.reduce((sum, drink) => {
    const cartItem = cart.find((i) => i.guestId === guest.id && i.drinkId === drink.id)
    return sum + (cartItem?.quantity ?? 0) * drink.price
  }, 0)

  function getQty(drinkId: string) {
    return cart.find((i) => i.guestId === guest.id && i.drinkId === drinkId)?.quantity ?? 0
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[520px] max-h-[85vh] flex flex-col mx-4 overflow-hidden">

        {/* Header — guest badge + total on same row */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-full">
            {renderIcon(category.icon, 15, 'opacity-80')}
            {guest.name}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Total</span>
            <span className="text-gray-900 font-bold text-lg">{formatPrice(categoryTotal)}</span>
          </div>
        </div>

        {/* Drink list — tap row to add, [−] to remove */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <div className="flex flex-col gap-2">
            {category.drinks.map((drink) => {
              const qty = getQty(drink.id)
              const lineTotal = qty * drink.price
              return (
                <div key={drink.id} className="flex items-center gap-3 py-4 min-h-[60px] border border-gray-200 rounded-xl px-4">

                  {/* + icon */}
                  <Plus size={18} className={`shrink-0 ${qty > 0 ? 'text-green-700' : 'text-gray-300'}`} />

                  {/* Tap the drink row to add one */}
                  <button
                    onClick={() => { navigator.vibrate?.(10); addDrinkToGuest(guest.id, drink.id) }}
                    className="flex-1 flex items-center gap-3 text-left group min-w-0 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-900 font-medium group-hover:text-green-700 transition-colors">
                        {drink.name}
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm shrink-0">{formatPrice(drink.price)}</span>
                  </button>

                  {/* Right side: line total + qty + [−] — always same height */}
                  <div className="flex items-center gap-3 shrink-0 w-36 justify-end min-h-[44px]">
                    {qty > 0 ? (
                      <>
                        <span className="text-gray-500 text-sm w-14 text-right">{formatPrice(lineTotal)}</span>
                        <span className="text-gray-900 font-bold w-5 text-center">{qty}</span>
                        <button
                          onClick={() => removeDrinkFromGuest(guest.id, drink.id)}
                          className="w-11 h-11 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors active:scale-95"
                        >
                          <Minus size={16} />
                        </button>
                      </>
                    ) : (
                      /* Placeholder matching the height of the active controls */
                      <div className="h-11" />
                    )}
                  </div>

                </div>
              )
            })}
          </div>

          {category.drinks.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">No drinks in this category.</p>
          )}
        </div>
      </div>
    </div>
  )
}
