import { Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import type { FeeTier } from '../../types'
import { formatPrice, parsePriceInput } from '../../utils/formatPrice'
import { generateId } from '../../utils/generateId'
import { defaultEntryFeeConfig } from '../../utils/sessionFee'

// Stable empty-array reference so the selector returns the same value across
// renders when tiers is briefly undefined (e.g. mid-migration), avoiding the
// "getSnapshot should be cached" infinite loop.
const NO_TIERS: FeeTier[] = []

export function SessionSettings() {
  const tiers = useStore((s) => s.entryFeeConfig?.tiers ?? NO_TIERS)
  const kohoFriendPriceCents = useStore(
    (s) => s.entryFeeConfig?.kohoFriendPriceCents ?? 2500
  )
  const update = useStore((s) => s.updateEntryFeeConfig)

  function patchTier(id: string, patch: Partial<FeeTier>) {
    update({ tiers: tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)) })
  }

  function removeTier(id: string) {
    if (tiers.length <= 1) return
    update({ tiers: tiers.filter((t) => t.id !== id) })
  }

  function addTier() {
    const last = tiers[tiers.length - 1]
    const minStart = last ? last.minEnd : 0
    const minEnd = minStart + 30
    update({
      tiers: [...tiers, { id: generateId(), minStart, minEnd, priceCents: 0 }],
    })
  }

  function resetToDefaults() {
    if (tiers.length > 0 && !window.confirm('Replace current tiers with the default 3-tier setup (0–15 free, 15–60 €10, 60+ €20)?')) return
    update({ tiers: defaultEntryFeeConfig().tiers })
  }

  const numClass =
    'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
  const labelClass = 'text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block'

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Session entry fee</h3>
      <p className="text-xs text-gray-400 mb-4">
        Define one row per tier. The check-out screen suggests the matching tier’s price by duration; staff can override.
      </p>

      {/* Summary — read-only, shown above the editable fields so the current rules are visible at a glance */}
      <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100 max-w-2xl text-xs text-gray-600 space-y-0.5">
        {tiers.length === 0 ? (
          <div className="text-gray-400">No tiers configured.</div>
        ) : (
          tiers.map((tier, i) => (
            <div key={tier.id}>
              <span className="font-semibold text-gray-700">Tier {i + 1}:</span>{' '}
              {tier.minStart}–{tier.minEnd} min →{' '}
              {tier.priceCents === 0 ? 'free' : formatPrice(tier.priceCents)}
            </div>
          ))
        )}
        <div className="pt-1">
          <span className="font-semibold text-gray-700 inline-flex items-center gap-1">
            <Sparkles size={11} /> KoHo Friend:
          </span>{' '}
          {formatPrice(kohoFriendPriceCents)}
        </div>
      </div>

      <div className="flex flex-col gap-2 max-w-2xl">
        {tiers.map((tier, i) => (
          <div key={tier.id} className="flex items-end gap-2">
            <div className="text-xs font-semibold text-gray-700 w-14 pb-2 shrink-0">Tier {i + 1}</div>
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div>
                <label className={labelClass}>From (min)</label>
                <input
                  type="number"
                  min={0}
                  defaultValue={tier.minStart}
                  onBlur={(e) => patchTier(tier.id, { minStart: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className={numClass}
                />
              </div>
              <div>
                <label className={labelClass}>To (min)</label>
                <input
                  type="number"
                  min={0}
                  defaultValue={tier.minEnd}
                  onBlur={(e) => patchTier(tier.id, { minEnd: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className={numClass}
                />
              </div>
              <div>
                <label className={labelClass}>Price (€)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  defaultValue={(tier.priceCents / 100).toFixed(2)}
                  onBlur={(e) => patchTier(tier.id, { priceCents: parsePriceInput(e.target.value) })}
                  className={numClass}
                />
              </div>
            </div>
            <button
              onClick={() => removeTier(tier.id)}
              disabled={tiers.length <= 1}
              className="p-2 mb-0.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors shrink-0"
              aria-label={`Delete tier ${i + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={addTier}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <Plus size={14} className="text-amber-600" />
          Add tier
        </button>
        <button
          onClick={resetToDefaults}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
        >
          <RotateCcw size={14} />
          Reset to defaults
        </button>
      </div>

      {/* KoHo Friend price — editable, lives below tier editor */}
      <div className="mt-6 pt-4 border-t border-gray-100 max-w-2xl">
        <label className={labelClass + ' flex items-center gap-1'}>
          <Sparkles size={11} /> KoHo Friend price (€)
        </label>
        <input
          key={kohoFriendPriceCents}
          type="text"
          inputMode="decimal"
          defaultValue={(kohoFriendPriceCents / 100).toFixed(2)}
          onBlur={(e) => update({ kohoFriendPriceCents: parsePriceInput(e.target.value) })}
          className={numClass + ' max-w-[200px]'}
        />
        <p className="text-[11px] text-gray-400 mt-1">
          Used by the "Becomes KoHo Friend" button on check-out.
        </p>
      </div>
    </div>
  )
}
