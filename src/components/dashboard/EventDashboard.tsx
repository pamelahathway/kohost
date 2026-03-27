import { useMemo } from 'react'
import { useStore } from '../../store'
import { formatPrice } from '../../utils/formatPrice'

export function EventDashboard() {
  const guests = useStore((s) => s.guests)
  const orders = useStore((s) => s.orders)
  const payments = useStore((s) => s.payments)
  const categories = useStore((s) => s.categories)

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

    const topDrinks = [...drinkCounts.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    // Guest stats
    const totalGuests = guests.length
    const paidGuests = guests.filter((g) => g.paid).length
    const outstandingGuests = totalGuests - paidGuests

    // Guests who ordered = guests with active orders OR payment records
    const guestIdsWithOrders = new Set([
      ...orders.filter((o) => o.quantity > 0).map((o) => o.guestId),
      ...payments.map((p) => p.guestId),
    ])
    const guestsWhoOrdered = guestIdsWithOrders.size

    const avgSpend =
      guestsWhoOrdered > 0 ? Math.round(combinedTotal / guestsWhoOrdered) : 0

    return {
      paidTotal,
      outstandingTotal,
      combinedTotal,
      totalDrinksServed,
      topDrinks,
      totalGuests,
      paidGuests,
      outstandingGuests,
      guestsWhoOrdered,
      avgSpend,
    }
  }, [guests, orders, payments, categories])

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Revenue row */}
        <div className="grid grid-cols-3 gap-4">
          <Card label="Total Revenue" large>
            <span className="text-4xl font-black text-gray-900">
              {formatPrice(stats.combinedTotal)}
            </span>
          </Card>
          <Card label="Paid">
            <span className="text-3xl font-bold text-green-600">
              {formatPrice(stats.paidTotal)}
            </span>
          </Card>
          <Card label="Outstanding">
            <span className="text-3xl font-bold text-amber-600">
              {formatPrice(stats.outstandingTotal)}
            </span>
          </Card>
        </div>

        {/* Drinks + average spend row */}
        <div className="grid grid-cols-2 gap-4">
          <Card label="Drinks Served">
            <span className="text-4xl font-black text-gray-900">
              {stats.totalDrinksServed}
            </span>
          </Card>
          <Card label="Avg Spend per Guest">
            <span className="text-4xl font-black text-gray-900">
              {formatPrice(stats.avgSpend)}
            </span>
            <span className="text-sm text-gray-400 mt-1">
              across {stats.guestsWhoOrdered} guest{stats.guestsWhoOrdered !== 1 ? 's' : ''}
            </span>
          </Card>
        </div>

        {/* Bottom row: top drinks + guest stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card label="Most Popular Drinks">
            {stats.topDrinks.length === 0 ? (
              <span className="text-gray-400 text-sm">No orders yet</span>
            ) : (
              <ol className="space-y-2 mt-1">
                {stats.topDrinks.map((d, i) => (
                  <li
                    key={d.name}
                    className="flex items-center justify-between"
                  >
                    <span className="text-gray-700 font-medium">
                      <span className="text-gray-400 mr-2 text-sm">
                        {i + 1}.
                      </span>
                      {d.name}
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {d.quantity}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card label="Guest Stats">
            <div className="space-y-3 mt-1">
              <StatRow label="Total guests" value={stats.totalGuests} />
              <StatRow
                label="Paid"
                value={stats.paidGuests}
                color="text-green-600"
              />
              <StatRow
                label="Outstanding"
                value={stats.outstandingGuests}
                color="text-amber-600"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Card({
  label,
  large,
  children,
}: {
  label: string
  large?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-2xl p-5 ${
        large ? 'col-span-1' : ''
      }`}
    >
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {label}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}

function StatRow({
  label,
  value,
  color = 'text-gray-900',
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  )
}
