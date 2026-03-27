import { useState } from 'react'
import { ArrowLeft, CheckCircle2, RotateCcw, ChevronDown, ChevronUp, Pencil, Plus, Minus, Printer } from 'lucide-react'
import type { Guest } from '../../types'
import { useStore } from '../../store'
import { formatPrice } from '../../utils/formatPrice'
import { Button } from '../shared/Button'
import { ConfirmDialog } from '../shared/ConfirmDialog'

interface TabDetailProps {
  guest: Guest
  onBack: () => void
}

export function TabDetail({ guest, onBack }: TabDetailProps) {
  const { eventName, getGuestLineItems, getGuestTotal, payments, markGuestPaid, reopenGuestTab, setOrderQuantity } = useStore()
  const [showConfirmPay, setShowConfirmPay] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editQty, setEditQty] = useState<Record<string, number>>({})

  const lineItems = getGuestLineItems(guest.id)
  const total = getGuestTotal(guest.id)
  const guestPayments = payments.filter((p) => p.guestId === guest.id)

  function startEditing() {
    const init: Record<string, number> = {}
    for (const item of lineItems) init[item.drinkId] = item.quantity
    setEditQty(init)
    setEditing(true)
  }

  function commitEditing() {
    for (const [drinkId, qty] of Object.entries(editQty)) {
      setOrderQuantity(guest.id, drinkId, qty)
    }
    setEditing(false)
  }

  function adjust(drinkId: string, delta: number) {
    setEditQty((prev) => ({ ...prev, [drinkId]: Math.max(0, (prev[drinkId] ?? 0) + delta) }))
  }

  // In edit mode, show all items (including those brought to 0)
  const displayItems = editing
    ? lineItems.map((item) => ({ ...item, quantity: editQty[item.drinkId] ?? item.quantity }))
    : lineItems

  const editTotal = editing
    ? displayItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    : total

  function handleMarkPaid() {
    markGuestPaid(guest.id)
    setShowConfirmPay(false)
    setEditing(false)
  }

  // Use current line items if unpaid, or the most recent payment record if paid
  const receiptItems = guest.paid && guestPayments.length > 0
    ? guestPayments[guestPayments.length - 1].items.map((i) => ({
        name: i.drinkName,
        qty: i.quantity,
        each: i.unitPrice,
        lineTotal: i.lineTotal,
      }))
    : lineItems.map((i) => ({
        name: i.drinkName,
        qty: i.quantity,
        each: i.unitPrice,
        lineTotal: i.unitPrice * i.quantity,
      }))

  const receiptTotal = guest.paid && guestPayments.length > 0
    ? guestPayments[guestPayments.length - 1].total
    : total

  function printReceipt() {
    const rows = receiptItems
      .map(
        (i) =>
          `<tr>
            <td style="padding:4px 0;text-align:left">${i.name}</td>
            <td style="padding:4px 8px;text-align:right">${i.qty}</td>
            <td style="padding:4px 8px;text-align:right">${formatPrice(i.each)}</td>
            <td style="padding:4px 0;text-align:right">${formatPrice(i.lineTotal)}</td>
          </tr>`
      )
      .join('')

    const date = guest.paidAt
      ? new Date(guest.paidAt).toLocaleString()
      : new Date().toLocaleString()

    const html = `<!DOCTYPE html>
<html><head><title>Receipt - ${guest.name}</title>
<style>
  body { font-family: monospace; max-width: 360px; margin: 24px auto; padding: 0 16px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 14px; font-weight: normal; color: #555; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { text-align: left; padding: 4px 0; border-bottom: 1px solid #333; font-size: 12px; text-transform: uppercase; color: #555; }
  thead th:not(:first-child) { text-align: right; padding: 4px 8px; }
  thead th:last-child { padding-right: 0; }
  tbody td { font-size: 14px; }
  tfoot td { padding-top: 8px; border-top: 1px solid #333; font-weight: bold; font-size: 16px; }
  .date { font-size: 12px; color: #555; margin-top: 16px; }
  .thanks { text-align: center; margin-top: 24px; font-size: 13px; color: #555; }
  @media print { body { margin: 0; } }
</style>
</head><body>
  <h1>${eventName}</h1>
  <h2>${guest.name}</h2>
  <table>
    <thead>
      <tr><th>Item</th><th style="text-align:right;padding:4px 8px">Qty</th><th style="text-align:right;padding:4px 8px">Each</th><th style="text-align:right;padding-right:0">Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="3" style="text-align:right;padding:8px 8px 0 0">Total</td><td style="text-align:right;padding-top:8px;border-top:1px solid #333">${formatPrice(receiptTotal)}</td></tr>
    </tfoot>
  </table>
  <p class="date">${date}</p>
  <p class="thanks">Thank you!</p>
  <script>window.onload=function(){window.print()}</script>
</body></html>`

    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 shrink-0 bg-gray-50">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{guest.name}</h2>
          {guest.paid && (
            <p className="text-green-700 text-xs flex items-center gap-1">
              <CheckCircle2 size={12} /> Paid {guest.paidAt ? new Date(guest.paidAt).toLocaleString() : ''}
            </p>
          )}
        </div>
        {!guest.paid && (
          <button
            onClick={editing ? commitEditing : startEditing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              editing
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
            }`}
          >
            <Pencil size={15} /> {editing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Current tab */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Current Tab</h3>
          {lineItems.length === 0 ? (
            <p className="text-gray-400 text-sm">No drinks on tab{guest.paid ? ' (paid)' : ''}.</p>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Drink</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Category</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Qty</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Each</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Total</th>
                    {editing && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item) => (
                    <tr key={item.drinkId} className={`border-b border-gray-100 last:border-0 ${item.quantity === 0 ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-3 text-gray-900">{item.drinkName}</td>
                      <td className="px-4 py-3 text-gray-500">{item.categoryName}</td>
                      <td className="px-4 py-3 text-gray-700 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-gray-500 text-right">{formatPrice(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-gray-900 text-right font-medium">{formatPrice(item.unitPrice * item.quantity)}</td>
                      {editing && (
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => adjust(item.drinkId, -1)}
                              disabled={item.quantity === 0}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus size={14} />
                            </button>
                            <button
                              onClick={() => adjust(item.drinkId, +1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={editing ? 5 : 4} className="px-4 py-3 text-gray-900 font-bold text-right">Total</td>
                    <td className="px-4 py-3 text-green-700 font-bold text-right text-base">{formatPrice(editTotal)}</td>
                    {editing && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Payment history */}
        {guestPayments.length > 0 && (
          <section>
            <button
              className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 hover:text-gray-600 transition-colors"
              onClick={() => setShowHistory(!showHistory)}
            >
              Payment History ({guestPayments.length})
              {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showHistory && (
              <div className="flex flex-col gap-3">
                {guestPayments.map((payment) => (
                  <div key={payment.id} className="bg-white rounded-xl overflow-hidden border border-gray-200">
                    <div className="px-4 py-2 bg-green-50 border-b border-gray-200 flex justify-between items-center">
                      <span className="text-green-700 text-sm font-medium flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Paid
                      </span>
                      <span className="text-gray-400 text-xs">{new Date(payment.paidAt).toLocaleString()}</span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        {payment.items.map((item, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="px-4 py-2 text-gray-700">{item.drinkName}</td>
                            <td className="px-4 py-2 text-gray-400">{item.categoryName}</td>
                            <td className="px-4 py-2 text-gray-500 text-right">×{item.quantity}</td>
                            <td className="px-4 py-2 text-gray-700 text-right font-medium">{formatPrice(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-200 bg-gray-50">
                          <td colSpan={3} className="px-4 py-2 text-gray-700 font-bold text-right">Total paid</td>
                          <td className="px-4 py-2 text-green-700 font-bold text-right">{formatPrice(payment.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0 bg-gray-50">
        {guest.paid ? (
          <>
            <Button variant="secondary" onClick={() => reopenGuestTab(guest.id)} className="flex items-center gap-2">
              <RotateCcw size={16} /> Reopen Tab
            </Button>
            <Button variant="ghost" onClick={printReceipt} className="flex items-center gap-2">
              <Printer size={16} /> Print Receipt
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="success"
              size="lg"
              disabled={lineItems.length === 0 || editing}
              onClick={() => setShowConfirmPay(true)}
              className="flex items-center gap-2"
            >
              <CheckCircle2 size={18} /> Mark as Paid — {formatPrice(total)}
            </Button>
            {lineItems.length > 0 && !editing && (
              <Button variant="ghost" onClick={printReceipt} className="flex items-center gap-2">
                <Printer size={16} /> Print Receipt
              </Button>
            )}
          </>
        )}
      </div>

      {showConfirmPay && (
        <ConfirmDialog
          title="Mark as Paid"
          message={`Confirm payment of ${formatPrice(total)} for ${guest.name}? Their tab will be cleared and recorded in history.`}
          confirmLabel="Confirm Payment"
          variant="success"
          onConfirm={handleMarkPaid}
          onCancel={() => setShowConfirmPay(false)}
        />
      )}
    </div>
  )
}
