import { Plus, RotateCcw, Trash2 } from 'lucide-react'
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

      <div className="text-xs text-gray-500 mt-4 max-w-2xl space-y-0.5">
        {tiers.map((tier, i) => (
          <div key={tier.id}>
            Tier {i + 1}: {tier.minStart}–{tier.minEnd} min →{' '}
            {tier.priceCents === 0 ? 'free' : formatPrice(tier.priceCents)}
          </div>
        ))}
      </div>
    </div>
  )
}
