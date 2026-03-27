import { useState } from 'react'
import { useStore } from '../../store'
import type { DrinkCategory } from '../../types'
import { renderIcon } from '../setup/IconPicker'
import { formatPrice } from '../../utils/formatPrice'
import { GuestPicker } from './GuestPicker'
import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react'
import { Button } from '../shared/Button'

export function OrderScreen() {
  const { categories, cart, addToCart, decrementCart, removeFromCart, clearCart, getCartTotal } = useStore()
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id ?? '')
  const [showGuestPicker, setShowGuestPicker] = useState(false)

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
  const selectedCat: DrinkCategory | undefined = sorted.find((c) => c.id === selectedCatId) ?? sorted[0]
  const cartTotal = getCartTotal()
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  if (categories.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <p>No menu configured yet. Go to Setup to add categories and drinks.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Left panel — drink selector */}
      <div className="flex-1 flex flex-col border-r border-slate-700 overflow-hidden">
        {/* Category tabs */}
        <div className="flex gap-1 px-4 pt-4 pb-2 overflow-x-auto shrink-0">
          {sorted.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                selectedCat?.id === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span>{renderIcon(cat.icon, 16)}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Drink list */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {selectedCat?.drinks.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">No drinks in this category yet.</p>
          )}
          <div className="flex flex-col gap-2">
            {selectedCat?.drinks.map((drink) => {
              const cartItem = cart.find((c) => c.drinkId === drink.id)
              return (
                <div
                  key={drink.id}
                  className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-slate-100 font-medium">{drink.name}</p>
                    <p className="text-slate-400 text-sm">{formatPrice(drink.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cartItem && (
                      <>
                        <button
                          onClick={() => decrementCart(drink.id)}
                          className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 active:scale-95 transition-all"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="w-8 text-center font-semibold text-slate-100 text-lg">
                          {cartItem.quantity}
                        </span>
                      </>
                    )}
                    <button
                      onClick={() => addToCart(drink.id)}
                      className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white active:scale-95 transition-all shadow-lg"
                    >
                      <Plus size={22} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right panel — cart */}
      <div className="w-72 flex flex-col bg-slate-850 overflow-hidden" style={{ background: '#0f172a' }}>
        <div className="px-4 py-4 border-b border-slate-700 flex items-center gap-2 shrink-0">
          <ShoppingCart size={18} className="text-slate-400" />
          <span className="font-semibold text-slate-100">Cart</span>
          {cartCount > 0 && (
            <span className="ml-auto text-xs text-slate-500">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-600">
              <ShoppingCart size={32} />
              <p className="text-sm">Tap + to add drinks</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cart.map((item) => (
                <div key={item.drinkId} className="bg-slate-800 rounded-xl px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-100 text-sm font-medium truncate">{item.drinkName}</p>
                      <p className="text-slate-500 text-xs">{item.categoryName}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.drinkId)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-0.5 shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => decrementCart(item.drinkId)}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-semibold text-slate-100 text-sm">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item.drinkId)}
                        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-slate-300 text-sm font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart footer */}
        <div className="px-4 py-4 border-t border-slate-700 shrink-0">
          {cart.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-400 text-sm">Subtotal</span>
                <span className="text-slate-100 font-bold text-lg">{formatPrice(cartTotal)}</span>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full mb-2"
                onClick={() => setShowGuestPicker(true)}
              >
                Add to Guest →
              </Button>
              <button
                onClick={clearCart}
                className="w-full text-center text-slate-500 hover:text-slate-300 text-sm py-1 transition-colors"
              >
                Clear cart
              </button>
            </>
          )}
        </div>
      </div>

      {showGuestPicker && <GuestPicker onClose={() => setShowGuestPicker(false)} />}
    </div>
  )
}
