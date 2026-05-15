import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './store'
import { defaultEntryFeeConfig } from './utils/sessionFee'
import type { Visitor } from './types'

/**
 * Reset the store to a known initial state for each test. Mirrors the store's
 * own initial state but lives here so the test file can stand alone.
 */
function resetStore() {
  useStore.setState({
    eventName: 'Test Event',
    setupComplete: true,
    eventMode: 'session',
    cloudBackupUrl: '',
    cloudBackupSecret: '',
    categories: [],
    guests: [],
    orders: [],
    payments: [],
    cart: [],
    visitors: [],
    entryFeeConfig: defaultEntryFeeConfig(),
    lastActiveGuestId: null,
    navigateToGuestId: null,
    requestedTab: null,
    syncStatus: 'idle',
    lastSyncedAt: null,
    syncError: null,
    _undoSnapshot: null,
    undoLabel: null,
  })
}

function makeRemoteVisitor(overrides: Partial<Visitor> & { id: string; updatedAt: number }): Visitor {
  const defaults: Omit<Visitor, 'id' | 'updatedAt'> = {
    name: 'remote',
    enteredAt: 0,
    exitedAt: null,
    paidAmount: null,
    paidAt: null,
    paidVia: null,
    amountOverridden: false,
    kohoFriend: false,
    reopenHistory: [],
    deleted: false,
    deviceId: 'remote-device',
  }
  return { ...defaults, ...overrides }
}

// ============================================================================
// Suite 2: Tier config + KoHo Friend price (store side)
// ============================================================================

describe('updateEntryFeeConfig', () => {
  beforeEach(resetStore)

  it('bumps lastModifiedAt on every edit', () => {
    const before = useStore.getState().entryFeeConfig.lastModifiedAt
    useStore.getState().updateEntryFeeConfig({ kohoFriendPriceCents: 3000 })
    const after = useStore.getState().entryFeeConfig.lastModifiedAt
    expect(after).toBeGreaterThan(before)
  })

  it('merges partial updates without losing other fields', () => {
    useStore.getState().updateEntryFeeConfig({ kohoFriendPriceCents: 4000 })
    const cfg = useStore.getState().entryFeeConfig
    expect(cfg.kohoFriendPriceCents).toBe(4000)
    expect(cfg.tiers).toHaveLength(3) // unchanged
  })
})

// ============================================================================
// Suite 2: Visitor actions
// ============================================================================

describe('addVisitor + checkOutVisitor', () => {
  beforeEach(resetStore)

  it('adds a visitor with sensible defaults', () => {
    useStore.getState().addVisitor('Anna')
    const v = useStore.getState().visitors[0]
    expect(v.name).toBe('Anna')
    expect(v.exitedAt).toBeNull()
    expect(v.paidAmount).toBeNull()
    expect(v.kohoFriend).toBe(false)
    expect(v.deleted).toBe(false)
    expect(v.enteredAt).toBeGreaterThan(0)
    expect(v.updatedAt).toBe(v.enteredAt)
  })

  it('checkOutVisitor stores amount and the kohoFriend flag', () => {
    useStore.getState().addVisitor('Bob')
    const id = useStore.getState().visitors[0].id
    useStore.getState().checkOutVisitor(id, {
      amountCents: 2500,
      paidVia: 'cash',
      overridden: true,
      kohoFriend: true,
    })
    const v = useStore.getState().visitors[0]
    expect(v.paidAmount).toBe(2500)
    expect(v.paidVia).toBe('cash')
    expect(v.amountOverridden).toBe(true)
    expect(v.kohoFriend).toBe(true)
    expect(v.exitedAt).toBeGreaterThan(0)
    expect(v.paidAt).toBe(v.exitedAt)
  })

  it('checkOutVisitor with kohoFriend=false leaves the flag unset', () => {
    useStore.getState().addVisitor('Carla')
    const id = useStore.getState().visitors[0].id
    useStore.getState().checkOutVisitor(id, {
      amountCents: 2500,
      paidVia: 'cash',
      overridden: false,
      kohoFriend: false,
    })
    expect(useStore.getState().visitors[0].kohoFriend).toBe(false)
  })

  it('removeVisitor tombstones rather than dropping the record', () => {
    useStore.getState().addVisitor('Dan')
    const id = useStore.getState().visitors[0].id
    const beforeUpdatedAt = useStore.getState().visitors[0].updatedAt
    // Wait at least 1ms so updatedAt can advance
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        useStore.getState().removeVisitor(id)
        const v = useStore.getState().visitors[0]
        expect(v).toBeDefined()
        expect(v.deleted).toBe(true)
        expect(v.updatedAt).toBeGreaterThanOrEqual(beforeUpdatedAt)
        resolve()
      }, 2)
    })
  })
})

describe('reopenVisitor', () => {
  beforeEach(resetStore)

  function checkInAndPayAnna() {
    useStore.getState().addVisitor('Anna')
    const id = useStore.getState().visitors[0].id
    useStore.getState().checkOutVisitor(id, {
      amountCents: 1000,
      paidVia: 'cash',
      overridden: false,
      kohoFriend: false,
    })
    return id
  }

  it('clears payment fields so the visitor returns to Inside', () => {
    const id = checkInAndPayAnna()
    useStore.getState().reopenVisitor(id, 'Marked paid by mistake')
    const v = useStore.getState().visitors[0]
    expect(v.exitedAt).toBeNull()
    expect(v.paidAmount).toBeNull()
    expect(v.paidAt).toBeNull()
    expect(v.paidVia).toBeNull()
    expect(v.amountOverridden).toBe(false)
    expect(v.kohoFriend).toBe(false)
  })

  it('preserves enteredAt so the tier calculator still reflects real time', () => {
    useStore.getState().addVisitor('Anna')
    const original = useStore.getState().visitors[0].enteredAt
    const id = useStore.getState().visitors[0].id
    useStore.getState().checkOutVisitor(id, {
      amountCents: 1000, paidVia: 'cash', overridden: false, kohoFriend: false,
    })
    useStore.getState().reopenVisitor(id, 'Wrong amount entered')
    expect(useStore.getState().visitors[0].enteredAt).toBe(original)
  })

  it('appends a record to reopenHistory with the previous payment snapshot', () => {
    useStore.getState().addVisitor('Anna')
    const id = useStore.getState().visitors[0].id
    useStore.getState().checkOutVisitor(id, {
      amountCents: 2500, paidVia: 'cash', overridden: true, kohoFriend: true,
    })
    useStore.getState().reopenVisitor(id, 'Wrong visitor')
    const v = useStore.getState().visitors[0]
    expect(v.reopenHistory).toHaveLength(1)
    expect(v.reopenHistory[0].reason).toBe('Wrong visitor')
    expect(v.reopenHistory[0].previousAmount).toBe(2500)
    expect(v.reopenHistory[0].previousPaidVia).toBe('cash')
    expect(v.reopenHistory[0].previousKohoFriend).toBe(true)
    expect(v.reopenHistory[0].at).toBeGreaterThan(0)
  })

  it('bumps updatedAt so the change syncs to other devices', () => {
    const id = checkInAndPayAnna()
    const before = useStore.getState().visitors[0].updatedAt
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        useStore.getState().reopenVisitor(id, 'Marked paid by mistake')
        expect(useStore.getState().visitors[0].updatedAt).toBeGreaterThan(before)
        resolve()
      }, 2)
    })
  })

  it('is a no-op when called on a visitor that is not checked out', () => {
    useStore.getState().addVisitor('Anna')
    const id = useStore.getState().visitors[0].id
    const before = useStore.getState().visitors[0]
    useStore.getState().reopenVisitor(id, 'Marked paid by mistake')
    const after = useStore.getState().visitors[0]
    expect(after.reopenHistory).toHaveLength(0)
    expect(after.updatedAt).toBe(before.updatedAt)
  })

  it('clears pendingUndoVisitorId when reopening that visitor', () => {
    const id = checkInAndPayAnna()
    useStore.getState().markPendingUndo(id)
    expect(useStore.getState().pendingUndoVisitorId).toBe(id)
    useStore.getState().reopenVisitor(id, 'Marked paid by mistake')
    expect(useStore.getState().pendingUndoVisitorId).toBeNull()
  })

  it('two reopens in sequence accumulate in reopenHistory', () => {
    const id = checkInAndPayAnna()
    useStore.getState().reopenVisitor(id, 'Marked paid by mistake')
    // Pay again and reopen again
    useStore.getState().checkOutVisitor(id, {
      amountCents: 2000, paidVia: 'cash', overridden: false, kohoFriend: false,
    })
    useStore.getState().reopenVisitor(id, 'Wrong amount entered')
    expect(useStore.getState().visitors[0].reopenHistory).toHaveLength(2)
    expect(useStore.getState().visitors[0].reopenHistory[0].previousAmount).toBe(1000)
    expect(useStore.getState().visitors[0].reopenHistory[1].previousAmount).toBe(2000)
  })
})

// ============================================================================
// Suite 4: Sync merge logic
// ============================================================================

describe('mergeRemoteVisitors', () => {
  beforeEach(resetStore)

  it('adds visitors not present locally', () => {
    const remote = makeRemoteVisitor({ id: 'r1', updatedAt: 100, name: 'Eve' })
    useStore.getState().mergeRemoteVisitors([remote])
    const local = useStore.getState().visitors
    expect(local).toHaveLength(1)
    expect(local[0].id).toBe('r1')
    expect(local[0].name).toBe('Eve')
  })

  it('replaces local with remote when remote.updatedAt is newer', () => {
    useStore.setState({
      visitors: [makeRemoteVisitor({ id: 'r1', updatedAt: 100, name: 'Old' })],
    })
    useStore.getState().mergeRemoteVisitors([
      makeRemoteVisitor({ id: 'r1', updatedAt: 200, name: 'New' }),
    ])
    expect(useStore.getState().visitors[0].name).toBe('New')
  })

  it('keeps local when local.updatedAt is newer', () => {
    useStore.setState({
      visitors: [makeRemoteVisitor({ id: 'r1', updatedAt: 200, name: 'Local' })],
    })
    useStore.getState().mergeRemoteVisitors([
      makeRemoteVisitor({ id: 'r1', updatedAt: 100, name: 'Stale' }),
    ])
    expect(useStore.getState().visitors[0].name).toBe('Local')
  })

  it('propagates tombstones (deleted=true) when remote is newer', () => {
    useStore.setState({
      visitors: [makeRemoteVisitor({ id: 'r1', updatedAt: 100, deleted: false })],
    })
    useStore.getState().mergeRemoteVisitors([
      makeRemoteVisitor({ id: 'r1', updatedAt: 200, deleted: true }),
    ])
    expect(useStore.getState().visitors[0].deleted).toBe(true)
  })

  it('returns the same visitors reference when nothing changed (no-op skip)', () => {
    const initial = [makeRemoteVisitor({ id: 'r1', updatedAt: 200 })]
    useStore.setState({ visitors: initial })
    const ref1 = useStore.getState().visitors
    useStore.getState().mergeRemoteVisitors([
      makeRemoteVisitor({ id: 'r1', updatedAt: 100 }), // older — should be ignored
    ])
    const ref2 = useStore.getState().visitors
    expect(ref2).toBe(ref1)
  })

  it('mixes new + updated + unchanged records correctly', () => {
    useStore.setState({
      visitors: [
        makeRemoteVisitor({ id: 'a', updatedAt: 100, name: 'a-old' }),
        makeRemoteVisitor({ id: 'b', updatedAt: 300, name: 'b-local-wins' }),
      ],
    })
    useStore.getState().mergeRemoteVisitors([
      makeRemoteVisitor({ id: 'a', updatedAt: 200, name: 'a-new' }), // newer → replace
      makeRemoteVisitor({ id: 'b', updatedAt: 100, name: 'b-stale' }), // older → keep
      makeRemoteVisitor({ id: 'c', updatedAt: 50, name: 'c' }), // new → add
    ])
    const visitors = useStore.getState().visitors
    const byId = new Map(visitors.map((v) => [v.id, v]))
    expect(byId.get('a')?.name).toBe('a-new')
    expect(byId.get('b')?.name).toBe('b-local-wins')
    expect(byId.get('c')?.name).toBe('c')
    expect(visitors).toHaveLength(3)
  })
})

describe('mergeRemoteEntryFeeConfig', () => {
  beforeEach(resetStore)

  it('replaces local when remote.lastModifiedAt is newer', () => {
    useStore.setState({
      entryFeeConfig: { ...defaultEntryFeeConfig(), lastModifiedAt: 100 },
    })
    useStore.getState().mergeRemoteEntryFeeConfig({
      tiers: [{ id: 'x', minStart: 0, minEnd: 30, priceCents: 500 }],
      kohoFriendPriceCents: 4000,
      lastModifiedAt: 200,
    })
    const cfg = useStore.getState().entryFeeConfig
    expect(cfg.tiers).toHaveLength(1)
    expect(cfg.kohoFriendPriceCents).toBe(4000)
    expect(cfg.lastModifiedAt).toBe(200)
  })

  it('ignores remote when local.lastModifiedAt is newer', () => {
    useStore.setState({
      entryFeeConfig: { ...defaultEntryFeeConfig(), lastModifiedAt: 500 },
    })
    useStore.getState().mergeRemoteEntryFeeConfig({
      tiers: [{ id: 'x', minStart: 0, minEnd: 30, priceCents: 500 }],
      kohoFriendPriceCents: 9999,
      lastModifiedAt: 100,
    })
    expect(useStore.getState().entryFeeConfig.lastModifiedAt).toBe(500)
    expect(useStore.getState().entryFeeConfig.kohoFriendPriceCents).not.toBe(9999)
  })

  it('ignores remote when timestamps are equal', () => {
    useStore.setState({
      entryFeeConfig: { ...defaultEntryFeeConfig(), lastModifiedAt: 100 },
    })
    useStore.getState().mergeRemoteEntryFeeConfig({
      tiers: [{ id: 'x', minStart: 0, minEnd: 30, priceCents: 500 }],
      kohoFriendPriceCents: 9999,
      lastModifiedAt: 100,
    })
    expect(useStore.getState().entryFeeConfig.lastModifiedAt).toBe(100)
  })

  it('ignores null / undefined remote', () => {
    useStore.setState({
      entryFeeConfig: { ...defaultEntryFeeConfig(), lastModifiedAt: 50 },
    })
    useStore.getState().mergeRemoteEntryFeeConfig(null)
    useStore.getState().mergeRemoteEntryFeeConfig(undefined)
    expect(useStore.getState().entryFeeConfig.lastModifiedAt).toBe(50)
  })

  it('ignores malformed remote (missing tiers)', () => {
    useStore.setState({
      entryFeeConfig: { ...defaultEntryFeeConfig(), lastModifiedAt: 50 },
    })
    // @ts-expect-error — exercising the runtime guard for bad shape
    useStore.getState().mergeRemoteEntryFeeConfig({ lastModifiedAt: 200 })
    expect(useStore.getState().entryFeeConfig.lastModifiedAt).toBe(50)
  })
})

// ============================================================================
// Suite 3: Mode switching
// ============================================================================

describe('setEventMode', () => {
  beforeEach(resetStore)

  it('switching from session to brunch clears visitors', () => {
    useStore.setState({
      eventMode: 'session',
      visitors: [makeRemoteVisitor({ id: 'a', updatedAt: 1 })],
    })
    useStore.getState().setEventMode('brunch')
    expect(useStore.getState().visitors).toEqual([])
    expect(useStore.getState().eventMode).toBe('brunch')
  })

  it('switching from brunch to session clears brunch data but not categories', () => {
    useStore.setState({
      eventMode: 'brunch',
      categories: [{ id: 'c1', name: 'Coffee', icon: 'coffee', sortOrder: 0, drinks: [] }],
      guests: [{ id: 'g1', name: 'Alice', sortOrder: 0, paid: false, paidAt: null }],
      orders: [{ guestId: 'g1', drinkId: 'd1', quantity: 1, createdAt: 0 }],
    })
    useStore.getState().setEventMode('session')
    const s = useStore.getState()
    expect(s.eventMode).toBe('session')
    expect(s.guests).toEqual([])
    expect(s.orders).toEqual([])
    expect(s.categories).toHaveLength(1) // categories survive
  })

  it('is a no-op when the target mode equals the current mode', () => {
    useStore.setState({
      eventMode: 'session',
      visitors: [makeRemoteVisitor({ id: 'a', updatedAt: 1 })],
    })
    useStore.getState().setEventMode('session')
    expect(useStore.getState().visitors).toHaveLength(1)
  })
})

// ============================================================================
// Suite 5: Reset / new event tombstoning
// ============================================================================

describe('resetEvent / startNewEvent tombstone visitors', () => {
  beforeEach(resetStore)

  it('resetEvent converts active visitors to tombstones', () => {
    useStore.setState({
      visitors: [
        makeRemoteVisitor({ id: 'a', updatedAt: 100, deleted: false }),
        makeRemoteVisitor({ id: 'b', updatedAt: 100, deleted: false }),
      ],
    })
    useStore.getState().resetEvent()
    const visitors = useStore.getState().visitors
    expect(visitors).toHaveLength(2)
    expect(visitors.every((v) => v.deleted)).toBe(true)
    // updatedAt should be bumped to a recent timestamp
    expect(visitors[0].updatedAt).toBeGreaterThan(100)
  })

  it('resetEvent leaves already-deleted visitors untouched', () => {
    const beforeDeletedAt = 50
    useStore.setState({
      visitors: [
        { ...makeRemoteVisitor({ id: 'a', updatedAt: beforeDeletedAt, deleted: true }) },
      ],
    })
    useStore.getState().resetEvent()
    expect(useStore.getState().visitors[0].updatedAt).toBe(beforeDeletedAt)
  })

  it('resetEvent clears eventMode + other event slices but keeps visitors-as-tombstones', () => {
    useStore.setState({
      eventMode: 'session',
      visitors: [makeRemoteVisitor({ id: 'a', updatedAt: 1 })],
      guests: [{ id: 'g', name: 'X', sortOrder: 0, paid: false, paidAt: null }],
    })
    useStore.getState().resetEvent()
    const s = useStore.getState()
    expect(s.eventMode).toBeNull()
    expect(s.guests).toEqual([])
    expect(s.visitors).toHaveLength(1)
    expect(s.visitors[0].deleted).toBe(true)
  })

  it('startNewEvent tombstones visitors AND defaults eventMode to session', () => {
    useStore.setState({
      eventMode: 'brunch',
      visitors: [makeRemoteVisitor({ id: 'a', updatedAt: 1 })],
    })
    useStore.getState().startNewEvent()
    const s = useStore.getState()
    expect(s.eventMode).toBe('session')
    expect(s.visitors).toHaveLength(1)
    expect(s.visitors[0].deleted).toBe(true)
  })

  it('a stale incoming sync echo does NOT undo tombstones', () => {
    // Scenario: device locally tombstones a visitor on reset (updatedAt=now),
    // then receives the pre-reset version of the same visitor from another
    // device that hadn't yet learned of the deletion. Merge should keep the
    // tombstone because its updatedAt is newer.
    useStore.setState({
      visitors: [
        makeRemoteVisitor({ id: 'a', updatedAt: 100, deleted: false, name: 'Anna' }),
      ],
    })
    useStore.getState().resetEvent()
    const tombstone = useStore.getState().visitors[0]
    expect(tombstone.deleted).toBe(true)

    // Stale echo with old updatedAt — should NOT resurrect
    useStore.getState().mergeRemoteVisitors([
      makeRemoteVisitor({ id: 'a', updatedAt: 100, deleted: false, name: 'Anna' }),
    ])
    expect(useStore.getState().visitors[0].deleted).toBe(true)
  })
})
