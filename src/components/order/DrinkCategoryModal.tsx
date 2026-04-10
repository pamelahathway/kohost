import { useEffect } from 'react'
import { Minus } from 'lucide-react'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[720px] max-h-[85vh] flex flex-col mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

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

        {/* Drink tiles — tap tile to add */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <div className="grid grid-cols-2 gap-3">
            {category.drinks.map((drink) => {
              const qty = getQty(drink.id)
              const active = qty > 0
              return (
                <button
                  key={drink.id}
                  onClick={() => { navigator.vibrate?.(10); addDrinkToGuest(guest.id, drink.id) }}
                  className={`relative flex flex-col items-center justify-center min-h-[120px] rounded-xl border-2 px-3 py-4 transition-colors active:scale-[0.97] ${
                    active
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200 bg-white active:bg-gray-50'
                  }`}
                >
                  {/* Quantity badge */}
                  {active && (
                    <span className="absolute top-2 right-2 min-w-[28px] h-7 flex items-center justify-center rounded-full bg-green-600 text-white text-sm font-bold px-1.5">
                      {qty}
                    </span>
                  )}

                  {/* Minus button */}
                  {active && (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); removeDrinkFromGuest(guest.id, drink.id) }}
                      className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-500 active:bg-red-50 active:border-red-300 active:text-red-600"
                    >
                      <Minus size={16} />
                    </span>
                  )}

                  <span className="text-gray-900 text-lg font-semibold text-center leading-tight">
                    {drink.name}
                  </span>
                  <span className="text-gray-500 text-base mt-1">{formatPrice(drink.price)}</span>
                </button>
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
