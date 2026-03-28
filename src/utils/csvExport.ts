import Papa from 'papaparse'
import type { Guest, OrderItem, DrinkCategory, PaymentRecord } from '../types'
import { formatPrice } from './formatPrice'

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function downloadCSV(rows: object[], filename: string): void {
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportGuestCSV(
  guest: Guest,
  orders: OrderItem[],
  categories: DrinkCategory[],
  payments: PaymentRecord[]
): void {
  const rows: object[] = []
  const allDrinks = categories.flatMap(c => c.drinks.map(d => ({ ...d, categoryName: c.name })))

  const guestOrders = orders.filter(o => o.guestId === guest.id && o.quantity > 0)
  for (const order of guestOrders) {
    const drink = allDrinks.find(d => d.id === order.drinkId)
    if (!drink) continue
    rows.push({
      Guest: guest.name,
      Drink: drink.name,
      Category: drink.categoryName,
      Quantity: order.quantity,
      'Unit Price': formatPrice(drink.price),
      'Line Total': formatPrice(drink.price * order.quantity),
      Status: 'unpaid',
      'Payment Date': '',
      'Ordered At': new Date(order.createdAt).toLocaleString(),
    })
  }

  for (const payment of payments.filter(p => p.guestId === guest.id)) {
    for (const [i, item] of payment.items.entries()) {
      const tip = (payment.amountPaid ?? payment.total) - payment.total
      rows.push({
        Guest: guest.name,
        Drink: item.drinkName,
        Category: item.categoryName,
        Quantity: item.quantity,
        'Unit Price': formatPrice(item.unitPrice),
        'Line Total': formatPrice(item.lineTotal),
        Status: 'paid',
        'Amount Paid': i === 0 ? formatPrice(payment.amountPaid ?? payment.total) : '',
        Tip: i === 0 && tip > 0 ? formatPrice(tip) : '',
        'Payment Date': new Date(payment.paidAt).toLocaleString(),
        'Ordered At': '',
      })
    }
  }

  downloadCSV(rows, `tab-${slugify(guest.name)}.csv`)
}

// Every individual order line and every payment line — one row per drink per transaction
export function exportAllCSV(
  guests: Guest[],
  orders: OrderItem[],
  categories: DrinkCategory[],
  payments: PaymentRecord[],
  eventName: string
): void {
  const rows: object[] = []
  const allDrinks = categories.flatMap(c => c.drinks.map(d => ({ ...d, categoryName: c.name })))

  for (const guest of guests) {
    // One row per unpaid order line
    for (const order of orders.filter(o => o.guestId === guest.id && o.quantity > 0)) {
      const drink = allDrinks.find(d => d.id === order.drinkId)
      if (!drink) continue
      rows.push({
        Guest: guest.name,
        Drink: drink.name,
        Category: drink.categoryName,
        Quantity: order.quantity,
        'Unit Price': formatPrice(drink.price),
        'Line Total': formatPrice(drink.price * order.quantity),
        Status: 'unpaid',
        'Payment Date': '',
        'Ordered At': new Date(order.createdAt).toLocaleString(),
      })
    }

    // One row per drink in every payment record
    for (const payment of payments.filter(p => p.guestId === guest.id)) {
      for (const [i, item] of payment.items.entries()) {
        const tip = (payment.amountPaid ?? payment.total) - payment.total
        rows.push({
          Guest: guest.name,
          Drink: item.drinkName,
          Category: item.categoryName,
          Quantity: item.quantity,
          'Unit Price': formatPrice(item.unitPrice),
          'Line Total': formatPrice(item.lineTotal),
          Status: 'paid',
          'Amount Paid': i === 0 ? formatPrice(payment.amountPaid ?? payment.total) : '',
          Tip: i === 0 && tip > 0 ? formatPrice(tip) : '',
          'Payment Date': new Date(payment.paidAt).toLocaleString(),
          'Ordered At': '',
        })
      }
    }
  }

  downloadCSV(rows, `kohost-${slugify(eventName)}-orders.csv`)
}

// One row per guest — name, total consumed, outstanding, paid
export function exportGuestListCSV(
  guests: Guest[],
  orders: OrderItem[],
  categories: DrinkCategory[],
  payments: PaymentRecord[],
  eventName: string
): void {
  const allDrinks = categories.flatMap(c => c.drinks.map(d => ({ ...d, categoryName: c.name })))

  const rows = guests
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(guest => {
      const outstanding = orders
        .filter(o => o.guestId === guest.id && o.quantity > 0)
        .reduce((sum, o) => {
          const drink = allDrinks.find(d => d.id === o.drinkId)
          return sum + (drink?.price ?? 0) * o.quantity
        }, 0)

      const guestPayments = payments.filter(p => p.guestId === guest.id)
      const totalPaid = guestPayments.reduce((sum, p) => sum + p.total, 0)
      const totalReceived = guestPayments.reduce((sum, p) => sum + (p.amountPaid ?? p.total), 0)
      const tips = totalReceived - totalPaid

      return {
        Guest: guest.name,
        Status: guest.paid ? 'paid' : 'outstanding',
        'Outstanding': formatPrice(outstanding),
        'Total Paid': formatPrice(totalPaid),
        'Tips': tips > 0 ? formatPrice(tips) : '',
        'Total Received': formatPrice(totalReceived > 0 ? totalReceived : outstanding),
        'Total Consumed': formatPrice(outstanding + totalPaid),
      }
    })

  downloadCSV(rows, `kohost-${slugify(eventName)}-guests.csv`)
}
