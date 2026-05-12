import type { EntryFeeConfig, FeeTier, Visitor } from '../types'
import { generateId } from './generateId'

export function defaultEntryFeeConfig(): EntryFeeConfig {
  return {
    tiers: [
      { id: generateId(), minStart: 0,  minEnd: 15,   priceCents: 0 },
      { id: generateId(), minStart: 15, minEnd: 60,   priceCents: 1000 },
      { id: generateId(), minStart: 60, minEnd: 9999, priceCents: 2000 },
    ],
    kohoFriendPriceCents: 2500,
    lastModifiedAt: 0,
  }
}

/**
 * Convert an unknown-shape entry-fee config into the current tiers-based shape.
 * Handles: missing config, the legacy {freeUnderMinutes, tier1Until, tier1Price, tier2Price} shape,
 * and the current tiers shape (passed through).
 */
export function normalizeEntryFeeConfig(input: unknown): EntryFeeConfig {
  if (!input || typeof input !== 'object') return defaultEntryFeeConfig()
  const obj = input as Record<string, unknown>
  if (Array.isArray(obj.tiers)) {
    return {
      tiers: obj.tiers as FeeTier[],
      kohoFriendPriceCents: typeof obj.kohoFriendPriceCents === 'number' ? obj.kohoFriendPriceCents : 2500,
      lastModifiedAt: typeof obj.lastModifiedAt === 'number' ? obj.lastModifiedAt : 0,
    }
  }
  // Legacy shape — convert to three tiers
  const freeUnder = (obj.freeUnderMinutes as number) ?? 15
  const tier1Until = (obj.tier1UntilMinutes as number) ?? 60
  const tier1Price = (obj.tier1PriceCents as number) ?? 1000
  const tier2Price = (obj.tier2PriceCents as number) ?? 2000
  return {
    tiers: [
      { id: generateId(), minStart: 0,         minEnd: freeUnder,   priceCents: 0 },
      { id: generateId(), minStart: freeUnder, minEnd: tier1Until,  priceCents: tier1Price },
      { id: generateId(), minStart: tier1Until, minEnd: 9999,       priceCents: tier2Price },
    ],
    kohoFriendPriceCents: 2500,
    lastModifiedAt: 0,
  }
}

export function calculateVisitorFee(visitor: Visitor, asOf: number, config: EntryFeeConfig): number {
  const minutes = (asOf - visitor.enteredAt) / 60000
  const tiers = config?.tiers
  if (!Array.isArray(tiers)) return 0
  for (const tier of tiers) {
    if (minutes >= tier.minStart && minutes < tier.minEnd) {
      return tier.priceCents
    }
  }
  return 0
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${Math.floor(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatTimeOfDay(ms: number): string {
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
