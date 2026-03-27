import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { CurrentOrderStrip } from './CurrentOrderStrip'
import { DrinkGrid } from './DrinkGrid'
import { useStore } from '../../store'
import { formatPrice } from '../../utils/formatPrice'
import { GuestPicker } from './GuestPicker'

export function OverviewScreen() {
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [showGuestPicker, setShowGuestPicker] = useState(false)
  const [pendingDrinkId, setPendingDrinkId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { categories, lastActiveGuestId, addDrinkToGuest, cart } = useStore()

  // Build flat drink list with category info
  const allDrinks = useMemo(
    () =>
      categories.flatMap((c) =>
        c.drinks.map((d) => ({
          id: d.id,
          name: d.name,
          price: d.price,
          categoryId: c.id,
          categoryName: c.name,
        }))
      ),
    [categories]
  )

  // Filter drinks by query
  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return allDrinks
      .filter((d) => d.name.toLowerCase().includes(q))
      .slice(0, 12)
  }, [query, allDrinks])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Determine active guest: the one with items in cart
  const activeGuestId = lastActiveGuestId && cart.length > 0 ? lastActiveGuestId : null

  function handleSelect(drinkId: string) {
    if (activeGuestId) {
      addDrinkToGuest(activeGuestId, drinkId)
      setQuery('')
      setShowResults(false)
      inputRef.current?.blur()
    } else {
      // No active guest — prompt to pick one
      setPendingDrinkId(drinkId)
      setShowGuestPicker(true)
      setShowResults(false)
    }
  }

  function handleGuestPicked() {
    // GuestPicker will assign cart to the picked guest.
    // If we had a pending drink, we need to add it after guest is picked.
    // Since GuestPicker uses addDrinkToGuest internally via assignCartToGuest,
    // we handle this by adding to cart first then showing picker.
    setPendingDrinkId(null)
    setShowGuestPicker(false)
    setQuery('')
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <CurrentOrderStrip />

      {/* Quick-add search bar */}
      <div className="px-5 py-2.5 border-b border-gray-200 bg-gray-50 shrink-0" ref={wrapperRef}>
        <div className="relative max-w-lg">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true) }}
            onFocus={() => setShowResults(true)}
            placeholder="Quick add — search drinks..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setShowResults(false); inputRef.current?.focus() }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X size={16} />
            </button>
          )}

          {/* Search results dropdown */}
          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-30 max-h-72 overflow-y-auto">
              {results.map((drink) => (
                <button
                  key={drink.id}
                  onClick={() => handleSelect(drink.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-green-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-900 font-medium text-sm">{drink.name}</span>
                    <span className="ml-2 text-gray-400 text-xs">{drink.categoryName}</span>
                  </div>
                  <span className="text-green-700 font-medium text-sm shrink-0">{formatPrice(drink.price)}</span>
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {showResults && query.trim() && results.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-30 px-4 py-3">
              <p className="text-gray-400 text-sm">No drinks match "{query}"</p>
            </div>
          )}
        </div>
      </div>

      <DrinkGrid />

      {showGuestPicker && (
        <GuestPicker
          onClose={handleGuestPicked}
          pendingDrinkId={pendingDrinkId}
        />
      )}
    </div>
  )
}
