import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useStore } from '../../store'
import { defaultEntryFeeConfig } from '../../utils/sessionFee'
import { CheckOutSheet } from './CheckOutSheet'
import type { Visitor } from '../../types'

const THIRTY_MIN = 30 * 60_000
const NINETY_MIN = 90 * 60_000

function resetStore() {
  useStore.setState({
    eventName: 'Test',
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

function seedVisitor(stayMs: number, overrides: Partial<Visitor> = {}): Visitor {
  const v: Visitor = {
    id: 'v1',
    name: 'Anna',
    enteredAt: Date.now() - stayMs,
    exitedAt: null,
    paidAmount: null,
    paidAt: null,
    paidVia: null,
    amountOverridden: false,
    kohoFriend: false,
    deleted: false,
    updatedAt: Date.now(),
    deviceId: 'dev',
    ...overrides,
  }
  useStore.setState({ visitors: [v] })
  return v
}

function getAmountInput(): HTMLInputElement {
  const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
  const amount = inputs.find((i) => i.inputMode === 'decimal')
  if (!amount) throw new Error('Amount input not found')
  return amount
}

describe('CheckOutSheet — suggested amount', () => {
  beforeEach(resetStore)

  it('pre-fills the input with the auto-suggested tier price', () => {
    seedVisitor(THIRTY_MIN) // tier 2 = €10
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    expect(getAmountInput().value).toBe('10.00')
  })

  it('shows the suggested tier price in the summary', () => {
    seedVisitor(NINETY_MIN) // tier 3 = €20
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    // "Suggested" cell shows €20.00
    expect(screen.getByText('€20.00')).toBeInTheDocument()
  })

  it('shows "free" suggestion for stays under the first tier', () => {
    seedVisitor(5 * 60_000) // 5 minutes, tier 1 = free
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    // Both the Suggested cell and the Mark paid button text say "free" —
    // assert via the input value instead.
    expect(getAmountInput().value).toBe('0.00')
    // And the Mark paid button label should include "free"
    expect(screen.getByRole('button', { name: /mark paid · free/i })).toBeInTheDocument()
  })
})

describe('CheckOutSheet — tier steppers', () => {
  beforeEach(resetStore)

  it('+ jumps to the next-higher tier price', () => {
    seedVisitor(THIRTY_MIN) // starts at €10
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /next tier up/i }))
    expect(getAmountInput().value).toBe('20.00')
  })

  it('- jumps to the next-lower tier price', () => {
    seedVisitor(THIRTY_MIN) // starts at €10
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /next tier down/i }))
    expect(getAmountInput().value).toBe('0.00')
  })

  it('+ is disabled at the top tier price', () => {
    seedVisitor(NINETY_MIN) // tier 3 = €20, top
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /next tier up/i })).toBeDisabled()
  })

  it('- is disabled at the bottom tier price', () => {
    seedVisitor(5 * 60_000) // €0, bottom
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /next tier down/i })).toBeDisabled()
  })

  it('+ from a custom in-between amount snaps to the next tier strictly greater', () => {
    seedVisitor(THIRTY_MIN)
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.change(getAmountInput(), { target: { value: '13.50' } })
    fireEvent.click(screen.getByRole('button', { name: /next tier up/i }))
    expect(getAmountInput().value).toBe('20.00')
  })
})

describe('CheckOutSheet — KoHo Friend', () => {
  beforeEach(resetStore)

  it('KoHo button sets the amount to the configured KoHo price', () => {
    seedVisitor(THIRTY_MIN)
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /becomes koho friend/i }))
    expect(getAmountInput().value).toBe('25.00')
  })

  it('KoHo + Mark paid persists kohoFriend=true on the visitor', () => {
    seedVisitor(THIRTY_MIN)
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /becomes koho friend/i }))
    fireEvent.click(screen.getByRole('button', { name: /mark paid/i }))
    const v = useStore.getState().visitors[0]
    expect(v.kohoFriend).toBe(true)
    expect(v.paidAmount).toBe(2500)
  })

  it('manually typing €25 does NOT set the KoHo flag', () => {
    seedVisitor(THIRTY_MIN)
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.change(getAmountInput(), { target: { value: '25.00' } })
    fireEvent.click(screen.getByRole('button', { name: /mark paid/i }))
    expect(useStore.getState().visitors[0].kohoFriend).toBe(false)
  })

  it('changing the amount via input after tapping KoHo clears the flag', () => {
    seedVisitor(THIRTY_MIN)
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /becomes koho friend/i }))
    fireEvent.change(getAmountInput(), { target: { value: '15.00' } })
    fireEvent.click(screen.getByRole('button', { name: /mark paid/i }))
    expect(useStore.getState().visitors[0].kohoFriend).toBe(false)
  })

  it('tapping - after KoHo clears the flag', () => {
    // After KoHo, amount is €25 which is above the top tier (€20). + is
    // disabled at the top, but - still has a lower tier (€20) to step to,
    // so we use - to exercise the clear-flag path.
    seedVisitor(THIRTY_MIN)
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /becomes koho friend/i }))
    fireEvent.click(screen.getByRole('button', { name: /next tier down/i }))
    fireEvent.click(screen.getByRole('button', { name: /mark paid/i }))
    expect(useStore.getState().visitors[0].kohoFriend).toBe(false)
    expect(useStore.getState().visitors[0].paidAmount).toBe(2000) // tier 3 €20
  })

  it('+ is disabled when at or above the top tier price (KoHo case)', () => {
    seedVisitor(THIRTY_MIN)
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /becomes koho friend/i }))
    expect(screen.getByRole('button', { name: /next tier up/i })).toBeDisabled()
  })

  it('respects a custom KoHo price set in entryFeeConfig', () => {
    useStore.getState().updateEntryFeeConfig({ kohoFriendPriceCents: 5000 })
    seedVisitor(THIRTY_MIN)
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /becomes koho friend/i }))
    expect(getAmountInput().value).toBe('50.00')
  })
})

describe('CheckOutSheet — Mark paid', () => {
  beforeEach(resetStore)

  it('persists the amount, paidVia, and override flag', () => {
    seedVisitor(THIRTY_MIN)
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.change(getAmountInput(), { target: { value: '11.50' } })
    fireEvent.click(screen.getByRole('button', { name: /mark paid/i }))
    const v = useStore.getState().visitors[0]
    expect(v.paidAmount).toBe(1150)
    expect(v.paidVia).toBe('cash')
    expect(v.amountOverridden).toBe(true)
    expect(v.exitedAt).toBeGreaterThan(0)
  })

  it('overridden flag is false when amount matches the suggested tier price', () => {
    seedVisitor(THIRTY_MIN) // suggested = €10
    render(<CheckOutSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /mark paid/i }))
    expect(useStore.getState().visitors[0].amountOverridden).toBe(false)
  })
})
