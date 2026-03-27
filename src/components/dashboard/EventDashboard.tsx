import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { formatPrice } from '../../utils/formatPrice'

export function EventDashboard() {
  const guests = useStore((s) => s.guests)
  const orders = useStore((s) => s.orders)
  const payments = useStore((s) => s.payments)
  const categories = useStore((s) => s.categories)

  const [showZeroDrinks, setShowZeroDrinks] = useState(true)
  const [showZeroGuests, setShowZeroGuests] = useState(true)

  const stats = useMemo(() => {
    const allDrinks = categories.flatMap((c) =>
      c.drinks.map((d) => ({ ...d, categoryName: c.name }))
    )
    const drinkMap = new Map(allDrinks.map((d) => [d.id, d]))

    // Outstanding totals (unpaid guests with active orders)
    const outstandingTotal = orders
      .filter((o) => {
        const guest = guests.find((g) => g.id === o.guestId)
        return o.quantity > 0 && guest && !guest.paid
      })
      .reduce((sum, o) => {
        const drink = drinkMap.get(o.drinkId)
        return sum + (drink?.price ?? 0) * o.quantity
      }, 0)

    // Paid totals from payment records
    const paidTotal = payments.reduce((sum, p) => sum + p.total, 0)

    const combinedTotal = paidTotal + outstandingTotal

    // Drink counts: combine active orders + payment records
    const drinkCounts = new Map<string, { name: string; quantity: number }>()

    for (const o of orders) {
      if (o.quantity <= 0) continue
      const drink = drinkMap.get(o.drinkId)
      const name = drink?.name ?? 'Unknown'
      const existing = drinkCounts.get(name)
      if (existing) {
        existing.quantity += o.quantity
      } else {
        drinkCounts.set(name, { name, quantity: o.quantity })
      }
    }

    for (const p of payments) {
      for (const item of p.items) {
        const existing = drinkCounts.get(item.drinkName)
        if (existing) {
          existing.quantity += item.quantity
        } else {
          drinkCounts.set(item.drinkName, {
            name: item.drinkName,
            quantity: item.quantity,
          })
        }
      }
    }

    const totalDrinksServed = [...drinkCounts.values()].reduce(
      (sum, d) => sum + d.quantity,
      0
    )

    // Build full drink list from menu, including zero-sales items
    const allMenuDrinks = allDrinks.map((d) => ({
      name: d.name,
      quantity: drinkCounts.get(d.name)?.quantity ?? 0,
    }))
    // Also include any drinks from drinkCounts that aren't in the current menu
    // (e.g. from payment records for drinks that were removed)
    for (const [name, entry] of drinkCounts) {
      if (!allMenuDrinks.some((d) => d.name === name)) {
        allMenuDrinks.push({ name, quantity: entry.quantity })
      }
    }
    const allDrinksSorted = allMenuDrinks.sort((a, b) => b.quantity - a.quantity)

    // Guest stats
    const totalGuests = guests.length
    const paidGuests = guests.filter((g) => g.paid).length
    const outstandingGuests = totalGuests - paidGuests

    // Guest spend data: outstanding amounts from orders + paid amounts from payments
    const guestSpendMap = new Map<string, { name: string; total: number }>()

    // Add outstanding amounts from active orders
    for (const o of orders) {
      if (o.quantity <= 0) continue
      const guest = guests.find((g) => g.id === o.guestId)
      if (!guest || guest.paid) continue
      const drink = drinkMap.get(o.drinkId)
      const amount = (drink?.price ?? 0) * o.quantity
      const existing = guestSpendMap.get(o.guestId)
      if (existing) {
        existing.total += amount
      } else {
        guestSpendMap.set(o.guestId, { name: guest.name, total: amount })
      }
    }

    // Add paid amounts from payment records
    for (const p of payments) {
      const existing = guestSpendMap.get(p.guestId)
      if (existing) {
        existing.total += p.total
      } else {
        guestSpendMap.set(p.guestId, { name: p.guestName, total: p.total })
      }
    }

    // Include all guests, even those with zero spend
    for (const g of guests) {
      if (!guestSpendMap.has(g.id)) {
        guestSpendMap.set(g.id, { name: g.name, total: 0 })
      }
    }

    const guestSpendSorted = [...guestSpendMap.values()].sort(
      (a, b) => b.total - a.total
    )

    return {
      paidTotal,
      outstandingTotal,
      combinedTotal,
      totalDrinksServed,
      allDrinksSorted,
      totalGuests,
      paidGuests,
      outstandingGuests,
      guestSpendSorted,
    }
  }, [guests, orders, payments, categories])

  const visibleDrinks = showZeroDrinks
    ? stats.allDrinksSorted
    : stats.allDrinksSorted.filter((d) => d.quantity > 0)

  const visibleGuests = showZeroGuests
    ? stats.guestSpendSorted
    : stats.guestSpendSorted.filter((g) => g.total > 0)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top tiles row */}
        <div className="grid grid-cols-4 gap-3">
          <Card label="Drinks Served">
            <span className="text-3xl font-black text-gray-900">
              {stats.totalDrinksServed}
            </span>
          </Card>
          <Card label="Total Revenue">
            <span className="text-3xl font-black text-gray-900">
              {formatPrice(stats.combinedTotal)}
            </span>
            <span className="text-xs text-gray-400 mt-0.5">
              ({stats.totalGuests} guest{stats.totalGuests !== 1 ? 's' : ''})
            </span>
          </Card>
          <Card label="Paid">
            <span className="text-3xl font-bold text-green-600">
              {formatPrice(stats.paidTotal)}
            </span>
            <span className="text-xs text-gray-400 mt-0.5">
              ({stats.paidGuests} guest{stats.paidGuests !== 1 ? 's' : ''})
            </span>
          </Card>
          <Card label="Outstanding">
            <span className="text-3xl font-bold text-amber-600">
              {formatPrice(stats.outstandingTotal)}
            </span>
            <span className="text-xs text-gray-400 mt-0.5">
              ({stats.outstandingGuests} guest{stats.outstandingGuests !== 1 ? 's' : ''})
            </span>
          </Card>
        </div>

        {/* Drink breakdown bar chart */}
        <Card
          label="Drink Breakdown"
          action={
            <button
              onClick={() => setShowZeroDrinks((v) => !v)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md px-2 py-0.5 transition-colors"
            >
              {showZeroDrinks ? 'Hide zero' : 'Show all'}
            </button>
          }
        >
          {visibleDrinks.length === 0 ? (
            <span className="text-gray-400 text-sm">No drinks on menu</span>
          ) : (
            <div className="space-y-2 mt-1">
              {(() => {
                const max = Math.max(...visibleDrinks.map((d) => d.quantity), 1)
                return visibleDrinks.map((d) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 font-medium w-32 shrink-0 truncate">
                      {d.name}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      {d.quantity > 0 && (
                        <div
                          className="h-full rounded-full bg-green-500"
                          style={{
                            width: `${Math.max((d.quantity / max) * 100, 2)}%`,
                          }}
                        />
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-8 text-right shrink-0">
                      {d.quantity}
                    </span>
                  </div>
                ))
              })()}
            </div>
          )}
        </Card>

        {/* Spend by Guest bar chart */}
        <Card
          label="Spend by Guest"
          action={
            <button
              onClick={() => setShowZeroGuests((v) => !v)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md px-2 py-0.5 transition-colors"
            >
              {showZeroGuests ? 'Hide zero' : 'Show all'}
            </button>
          }
        >
          {visibleGuests.length === 0 ? (
            <span className="text-gray-400 text-sm">No guest spend yet</span>
          ) : (
            <div className="space-y-2 mt-1">
              {(() => {
                const max = Math.max(...visibleGuests.map((g) => g.total), 1)
                return visibleGuests.map((g) => (
                  <div key={g.name} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 font-medium w-32 shrink-0 truncate">
                      {g.name}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      {g.total > 0 && (
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{
                            width: `${Math.max((g.total / max) * 100, 2)}%`,
                          }}
                        />
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-16 text-right shrink-0">
                      {formatPrice(g.total)}
                    </span>
                  </div>
                ))
              })()}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Card({
  label,
  children,
  action,
}: {
  label: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {label}
        </div>
        {action}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}
