import { describe, it, expect } from 'vitest'
import type { Visitor } from '../types'
import {
  calculateVisitorFee,
  defaultEntryFeeConfig,
  normalizeEntryFeeConfig,
  formatDuration,
} from './sessionFee'

function makeVisitor(enteredMinutesAgo: number): Visitor {
  return {
    id: 'v1',
    name: 'Anna',
    enteredAt: Date.now() - enteredMinutesAgo * 60_000,
    exitedAt: null,
    paidAmount: null,
    paidAt: null,
    paidVia: null,
    amountOverridden: false,
    kohoFriend: false,
    deleted: false,
    updatedAt: Date.now(),
    deviceId: 'dev-1',
  }
}

describe('calculateVisitorFee', () => {
  const config = {
    tiers: [
      { id: 't1', minStart: 0, minEnd: 15, priceCents: 0 },
      { id: 't2', minStart: 15, minEnd: 60, priceCents: 1000 },
      { id: 't3', minStart: 60, minEnd: 9999, priceCents: 2000 },
    ],
    kohoFriendPriceCents: 2500,
    lastModifiedAt: 0,
  }

  it('returns 0 in the free tier', () => {
    expect(calculateVisitorFee(makeVisitor(5), Date.now(), config)).toBe(0)
  })

  it('returns the tier-2 price for mid-range stays', () => {
    expect(calculateVisitorFee(makeVisitor(30), Date.now(), config)).toBe(1000)
  })

  it('returns the top tier price for long stays', () => {
    expect(calculateVisitorFee(makeVisitor(120), Date.now(), config)).toBe(2000)
  })

  it('treats minStart as inclusive', () => {
    // exactly 15 minutes → falls into tier 2 (minStart: 15)
    expect(calculateVisitorFee(makeVisitor(15), Date.now(), config)).toBe(1000)
  })

  it('treats minEnd as exclusive', () => {
    // 14.999 minutes → still tier 1 free
    const v = makeVisitor(14.99)
    expect(calculateVisitorFee(v, Date.now(), config)).toBe(0)
  })

  it('returns 0 when a duration falls into a gap between tiers', () => {
    const gappy = {
      tiers: [
        { id: 't1', minStart: 0, minEnd: 10, priceCents: 0 },
        { id: 't2', minStart: 30, minEnd: 60, priceCents: 1000 },
      ],
      kohoFriendPriceCents: 2500,
      lastModifiedAt: 0,
    }
    expect(calculateVisitorFee(makeVisitor(20), Date.now(), gappy)).toBe(0)
  })

  it('returns 0 when duration exceeds the top tier minEnd', () => {
    // No "and above" extension — staff configures explicit top bound
    expect(calculateVisitorFee(makeVisitor(10_000), Date.now(), config)).toBe(0)
  })

  it('returns 0 when there are no tiers configured', () => {
    expect(
      calculateVisitorFee(makeVisitor(30), Date.now(), {
        tiers: [],
        kohoFriendPriceCents: 2500,
        lastModifiedAt: 0,
      })
    ).toBe(0)
  })
})

describe('defaultEntryFeeConfig', () => {
  it('returns the agreed 3-tier setup', () => {
    const cfg = defaultEntryFeeConfig()
    expect(cfg.tiers).toHaveLength(3)
    expect(cfg.tiers[0]).toMatchObject({ minStart: 0, minEnd: 15, priceCents: 0 })
    expect(cfg.tiers[1]).toMatchObject({ minStart: 15, minEnd: 60, priceCents: 1000 })
    expect(cfg.tiers[2]).toMatchObject({ minStart: 60, minEnd: 9999, priceCents: 2000 })
  })

  it('sets KoHo Friend price to €25', () => {
    expect(defaultEntryFeeConfig().kohoFriendPriceCents).toBe(2500)
  })

  it('initialises lastModifiedAt to 0 so first edit on any device wins', () => {
    expect(defaultEntryFeeConfig().lastModifiedAt).toBe(0)
  })

  it('generates distinct tier IDs', () => {
    const ids = defaultEntryFeeConfig().tiers.map((t) => t.id)
    expect(new Set(ids).size).toBe(3)
  })
})

describe('normalizeEntryFeeConfig', () => {
  it('returns defaults when input is undefined', () => {
    const result = normalizeEntryFeeConfig(undefined)
    expect(result.tiers).toHaveLength(3)
    expect(result.kohoFriendPriceCents).toBe(2500)
  })

  it('returns defaults when input is null', () => {
    const result = normalizeEntryFeeConfig(null)
    expect(result.tiers).toHaveLength(3)
  })

  it('passes through current tiers-shape unchanged', () => {
    const input = {
      tiers: [{ id: 'x', minStart: 0, minEnd: 10, priceCents: 500 }],
      kohoFriendPriceCents: 3000,
      lastModifiedAt: 12345,
    }
    const result = normalizeEntryFeeConfig(input)
    expect(result.tiers).toEqual(input.tiers)
    expect(result.kohoFriendPriceCents).toBe(3000)
    expect(result.lastModifiedAt).toBe(12345)
  })

  it('converts legacy {freeUnderMinutes, tier1Until, tier1Price, tier2Price} shape', () => {
    const legacy = {
      freeUnderMinutes: 20,
      tier1UntilMinutes: 90,
      tier1PriceCents: 1500,
      tier2PriceCents: 3000,
    }
    const result = normalizeEntryFeeConfig(legacy)
    expect(result.tiers).toHaveLength(3)
    expect(result.tiers[0]).toMatchObject({ minStart: 0, minEnd: 20, priceCents: 0 })
    expect(result.tiers[1]).toMatchObject({ minStart: 20, minEnd: 90, priceCents: 1500 })
    expect(result.tiers[2]).toMatchObject({ minStart: 90, minEnd: 9999, priceCents: 3000 })
    expect(result.kohoFriendPriceCents).toBe(2500) // legacy didn't have this; default applied
    expect(result.lastModifiedAt).toBe(0)
  })

  it('defaults kohoFriendPriceCents when missing in a current-shape config', () => {
    const result = normalizeEntryFeeConfig({
      tiers: [{ id: 'a', minStart: 0, minEnd: 60, priceCents: 100 }],
      lastModifiedAt: 5,
    })
    expect(result.kohoFriendPriceCents).toBe(2500)
  })
})

describe('formatDuration', () => {
  it('shows <1m for sub-minute durations', () => {
    expect(formatDuration(0.5)).toBe('<1m')
  })

  it('shows minutes when under an hour', () => {
    expect(formatDuration(47.3)).toBe('47m')
  })

  it('shows hours only when minutes round to 0', () => {
    expect(formatDuration(120)).toBe('2h')
  })

  it('shows hours and minutes when over an hour', () => {
    expect(formatDuration(63)).toBe('1h 3m')
  })
})
