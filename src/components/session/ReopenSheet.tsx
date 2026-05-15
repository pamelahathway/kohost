import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useStore } from '../../store'
import { formatDuration, formatTimeOfDay } from '../../utils/sessionFee'
import { formatPrice } from '../../utils/formatPrice'
import { autoBackup } from '../../utils/autoBackup'

interface ReopenSheetProps {
  visitorId: string
  onClose: () => void
}

const REASONS = [
  'Marked paid by mistake',
  'Wrong amount entered',
  'KoHo Friend status wrong',
  'Other',
] as const

type Reason = (typeof REASONS)[number]

export function ReopenSheet({ visitorId, onClose }: ReopenSheetProps) {
  const visitor = useStore((s) => s.visitors.find((v) => v.id === visitorId))
  const reopenVisitor = useStore((s) => s.reopenVisitor)

  const [reason, setReason] = useState<Reason>('Marked paid by mistake')
  const [otherText, setOtherText] = useState('')

  // Lock body scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (!visitor) return null

  const finalReason = reason === 'Other' ? (otherText.trim() || 'Other') : reason
  const canConfirm = reason !== 'Other' || otherText.trim().length > 0

  const exitedAt = visitor.exitedAt ?? Date.now()
  const stayMin = (exitedAt - visitor.enteredAt) / 60000

  function handleConfirm() {
    if (!canConfirm) return
    reopenVisitor(visitor!.id, finalReason)
    autoBackup()
    onClose()
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
            <div className="text-xs uppercase tracking-wider text-gray-400">Reopen check-in</div>
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
          {/* Visitor summary */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400">Stay</div>
              <div className="font-semibold text-gray-900 mt-0.5">
                {formatTimeOfDay(visitor.enteredAt)} → {formatTimeOfDay(exitedAt)}
              </div>
              <div className="text-xs text-gray-500">{formatDuration(stayMin)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-gray-400">Paid</div>
              <div className="font-semibold text-gray-900 mt-0.5">
                {visitor.paidAmount === null
                  ? '—'
                  : visitor.paidAmount === 0
                    ? 'free'
                    : formatPrice(visitor.paidAmount)}
              </div>
              {visitor.kohoFriend && (
                <div className="text-xs text-gray-700 mt-0.5 inline-flex items-center gap-1">
                  <Sparkles size={11} /> KoHo Friend
                </div>
              )}
            </div>
          </div>

          {/* Reason picker */}
          <div className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            Why reopen?
          </div>
          <div className="flex flex-col gap-1.5">
            {REASONS.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer min-h-[44px] ${
                  reason === r
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="reopen-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="w-4 h-4 accent-amber-600"
                />
                <span className="text-sm text-gray-900">{r}</span>
              </label>
            ))}
          </div>

          {reason === 'Other' && (
            <input
              type="text"
              autoFocus
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Tell us why"
              className="mt-3 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          )}

          {visitor.reopenHistory.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
              <div className="font-semibold text-gray-600 mb-1">Previous reopens</div>
              <ul className="space-y-0.5">
                {visitor.reopenHistory.map((r) => (
                  <li key={r.at}>
                    {new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                    {r.reason} ·{' '}
                    {r.previousAmount === null
                      ? '—'
                      : r.previousAmount === 0
                        ? 'free'
                        : formatPrice(r.previousAmount)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold active:scale-[0.99] transition min-h-[48px] disabled:opacity-40 disabled:pointer-events-none"
          >
            Reopen check-in
          </button>
        </div>
      </div>
    </div>
  )
}
