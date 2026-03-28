import { useState, useEffect, useRef } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { formatPrice, parsePriceInput } from '../../utils/formatPrice'
import { Button } from '../shared/Button'

interface PaymentModalProps {
  guestName: string
  tabTotal: number // cents
  onConfirm: (amountPaidCents: number) => void
  onCancel: () => void
}

export function PaymentModal({ guestName, tabTotal, onConfirm, onCancel }: PaymentModalProps) {
  const [inputValue, setInputValue] = useState((tabTotal / 100).toFixed(2))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Select all text on mount for easy overwrite
    inputRef.current?.select()
  }, [])

  const amountCents = parsePriceInput(inputValue)
  const tip = amountCents - tabTotal
  const isValid = amountCents >= tabTotal

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] mx-4 border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mark as Paid</h2>
          <p className="text-sm text-gray-500 mt-0.5">{guestName}</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Tab total */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Tab total</span>
            <span className="text-lg font-bold text-gray-900">{formatPrice(tabTotal)}</span>
          </div>

          {/* Amount paid input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount received</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">€</span>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && isValid) onConfirm(amountCents) }}
                className="w-full pl-8 pr-4 py-3 text-xl font-bold text-right border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            {!isValid && amountCents > 0 && (
              <p className="text-red-500 text-xs mt-1">Amount must be at least {formatPrice(tabTotal)}</p>
            )}
          </div>

          {/* Tip display */}
          {tip > 0 && (
            <div className="flex justify-between items-center bg-green-50 rounded-xl px-4 py-3">
              <span className="text-sm text-green-700">Tip</span>
              <span className="text-lg font-bold text-green-700">{formatPrice(tip)}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button
            variant="success"
            disabled={!isValid}
            onClick={() => onConfirm(amountCents)}
            className="flex items-center gap-2"
          >
            <CheckCircle2 size={16} /> Confirm Payment
          </Button>
        </div>
      </div>
    </div>
  )
}
