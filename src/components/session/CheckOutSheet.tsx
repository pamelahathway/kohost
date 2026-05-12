import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Sparkles, X } from 'lucide-react'
import { useStore } from '../../store'
import { calculateVisitorFee, formatDuration, formatTimeOfDay } from '../../utils/sessionFee'
import { formatPrice, parsePriceInput } from '../../utils/formatPrice'
import { autoBackup } from '../../utils/autoBackup'

interface CheckOutSheetProps {
  visitorId: string
  onClose: () => void
}

const KOHO_FRIEND_FALLBACK_CENTS = 2500

export function CheckOutSheet({ visitorId, onClose }: CheckOutSheetProps) {
  const visitor = useStore((s) => s.visitors.find((v) => v.id === visitorId))
  const config = useStore((s) => s.entryFeeConfig)
  const checkOutVisitor = useStore((s) => s.checkOutVisitor)
  const removeVisitor = useStore((s) => s.removeVisitor)

  const [now, setNow] = useState(Date.now())

  // Tick once per minute — duration only matters at minute resolution here
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Lock body scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const autoCents = useMemo(
    () => (visitor ? calculateVisitorFee(visitor, now, config) : 0),
    [visitor, now, config]
  )

  const kohoPriceCents = config?.kohoFriendPriceCents ?? KOHO_FRIEND_FALLBACK_CENTS

  // Initialize editable amount once when sheet opens / visitor loads
  const [amountText, setAmountText] = useState(() => (autoCents / 100).toFixed(2))
  // KoHo Friend flag — set when the user taps the KoHo button, cleared on
  // any other amount change. Stored on the visitor at checkout.
  const [kohoSelected, setKohoSelected] = useState(false)

  // Sorted unique tier prices for the up/down steppers
  const tierPrices = useMemo(() => {
    const set = new Set((config?.tiers ?? []).map((t) => t.priceCents))
    return [...set].sort((a, b) => a - b)
  }, [config])

  if (!visitor) return null

  const minutes = (now - visitor.enteredAt) / 60000
  const enteredAmountCents = parsePriceInput(amountText)
  const overridden = enteredAmountCents !== autoCents

  const nextTierUp = tierPrices.find((p) => p > enteredAmountCents)
  const nextTierDown = [...tierPrices].reverse().find((p) => p < enteredAmountCents)

  // Most paths through the sheet should clear the KoHo flag — only the KoHo
  // button itself sets it. Helper centralises the "amount changed by some
  // other path" reset.
  function setAmountCents(cents: number, opts?: { keepKoho?: boolean }) {
    setAmountText((cents / 100).toFixed(2))
    if (!opts?.keepKoho) setKohoSelected(false)
  }

  function handleConfirm() {
    checkOutVisitor(visitor!.id, {
      amountCents: enteredAmountCents,
      paidVia: 'cash',
      overridden,
      kohoFriend: kohoSelected,
    })
    autoBackup()
    onClose()
  }

  function handleCancelCheckIn() {
    if (window.confirm(`Cancel ${visitor!.name}'s check-in? This removes the record.`)) {
      removeVisitor(visitor!.id)
      autoBackup()
      onClose()
    }
  }

  function resetToAuto() {
    setAmountCents(autoCents)
  }

  function selectKohoFriend() {
    setAmountCents(kohoPriceCents, { keepKoho: true })
    setKohoSelected(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-gray-400">Check out</div>
            <h2 className="text-lg font-bold text-gray-900 truncate">{visitor.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors -mr-2"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400">Entered</div>
              <div className="font-semibold text-gray-900 mt-0.5">{formatTimeOfDay(visitor.enteredAt)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400">Duration</div>
              <div className="font-semibold text-gray-900 mt-0.5">{formatDuration(minutes)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400">Suggested</div>
              <div className="font-semibold text-amber-600 mt-0.5">
                {autoCents === 0 ? 'free' : formatPrice(autoCents)}
              </div>
            </div>
          </div>

          <label className="text-xs font-medium text-gray-500 mb-1 block">Amount to charge</label>
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => { setAmountText(e.target.value); setKohoSelected(false) }}
                autoFocus
                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <button
              onMouseDown={(e) => e.preventDefault()}
              tabIndex={-1}
              onClick={() => nextTierUp !== undefined && setAmountCents(nextTierUp)}
              disabled={nextTierUp === undefined}
              aria-label="Next tier up"
              title={nextTierUp !== undefined ? `Up to ${formatPrice(nextTierUp)}` : 'Already at top tier'}
              className="w-12 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.97] transition flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
            >
              <Plus size={22} />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              tabIndex={-1}
              onClick={() => nextTierDown !== undefined && setAmountCents(nextTierDown)}
              disabled={nextTierDown === undefined}
              aria-label="Next tier down"
              title={nextTierDown !== undefined ? `Down to ${formatPrice(nextTierDown)}` : 'Already at bottom tier'}
              className="w-12 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.97] transition flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
            >
              <Minus size={22} />
            </button>
          </div>
          {overridden && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              tabIndex={-1}
              onClick={resetToAuto}
              className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-800 underline"
            >
              Reset to suggested ({autoCents === 0 ? 'free' : formatPrice(autoCents)})
            </button>
          )}

          <button
            onClick={selectKohoFriend}
            className={`mt-5 w-full px-4 py-3 rounded-xl text-white font-semibold active:scale-[0.99] transition min-h-[48px] flex items-center justify-center gap-2 ${
              kohoSelected
                ? 'bg-gray-900 ring-2 ring-gray-900 ring-offset-2'
                : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            <Sparkles size={18} />
            {kohoSelected ? 'KoHo Friend' : 'Becomes KoHo Friend'} · {formatPrice(kohoPriceCents)}
          </button>

          <button
            onClick={handleCancelCheckIn}
            className="mt-3 w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 active:scale-[0.99] transition min-h-[48px]"
          >
            Cancel check-in
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200">
          <button
            onClick={handleConfirm}
            className="w-full px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold active:scale-[0.99] transition min-h-[48px]"
          >
            Mark paid · {enteredAmountCents === 0 ? 'free' : formatPrice(enteredAmountCents)}
          </button>
        </div>
      </div>
    </div>
  )
}
