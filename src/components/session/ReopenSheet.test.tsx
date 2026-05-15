import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useStore } from '../../store'
import { defaultEntryFeeConfig } from '../../utils/sessionFee'
import { ReopenSheet } from './ReopenSheet'
import type { Visitor } from '../../types'

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
    pendingUndoVisitorId: null,
    _undoSnapshot: null,
    undoLabel: null,
  })
}

function seedPaidVisitor(overrides: Partial<Visitor> = {}) {
  const v: Visitor = {
    id: 'v1',
    name: 'Anna',
    enteredAt: Date.now() - 30 * 60_000,
    exitedAt: Date.now() - 60_000,
    paidAmount: 1000,
    paidAt: Date.now() - 60_000,
    paidVia: 'cash',
    amountOverridden: false,
    kohoFriend: false,
    reopenHistory: [],
    deleted: false,
    updatedAt: Date.now(),
    deviceId: 'dev',
    ...overrides,
  }
  useStore.setState({ visitors: [v] })
  return v
}

describe('ReopenSheet', () => {
  beforeEach(resetStore)

  it('renders the visitor summary', () => {
    seedPaidVisitor()
    render(<ReopenSheet visitorId="v1" onClose={() => {}} />)
    expect(screen.getByText('Anna')).toBeInTheDocument()
    expect(screen.getByText('€10.00')).toBeInTheDocument()
  })

  it('shows the KoHo Friend indicator when applicable', () => {
    seedPaidVisitor({ kohoFriend: true, paidAmount: 2500 })
    render(<ReopenSheet visitorId="v1" onClose={() => {}} />)
    expect(screen.getByText(/koho friend/i)).toBeInTheDocument()
  })

  it('defaults reason to "Marked paid by mistake"', () => {
    seedPaidVisitor()
    render(<ReopenSheet visitorId="v1" onClose={() => {}} />)
    const radio = screen.getByLabelText(/marked paid by mistake/i) as HTMLInputElement
    expect(radio.checked).toBe(true)
  })

  it('Reopen confirms with the selected reason and reverts the visitor', () => {
    seedPaidVisitor()
    render(<ReopenSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText(/wrong amount entered/i))
    fireEvent.click(screen.getByRole('button', { name: /reopen check-in/i }))
    const v = useStore.getState().visitors[0]
    expect(v.exitedAt).toBeNull()
    expect(v.paidAmount).toBeNull()
    expect(v.reopenHistory).toHaveLength(1)
    expect(v.reopenHistory[0].reason).toBe('Wrong amount entered')
  })

  it('Other reason requires the text input before Reopen is enabled', () => {
    seedPaidVisitor()
    render(<ReopenSheet visitorId="v1" onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText(/other/i))
    const confirmBtn = screen.getByRole('button', { name: /reopen check-in/i })
    expect(confirmBtn).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText(/tell us why/i), {
      target: { value: 'Visitor disputed' },
    })
    expect(confirmBtn).not.toBeDisabled()
    fireEvent.click(confirmBtn)
    expect(useStore.getState().visitors[0].reopenHistory[0].reason).toBe('Visitor disputed')
  })

  it('renders previous reopens when reopenHistory is non-empty', () => {
    seedPaidVisitor({
      reopenHistory: [
        { at: Date.now() - 60_000, reason: 'Visitor disputed', previousAmount: 500, previousPaidVia: 'cash', previousKohoFriend: false },
      ],
    })
    render(<ReopenSheet visitorId="v1" onClose={() => {}} />)
    expect(screen.getByText(/previous reopens/i)).toBeInTheDocument()
    // The history line includes the reason and previous amount
    expect(screen.getByText(/visitor disputed/i)).toBeInTheDocument()
    expect(screen.getByText(/€5\.00/i)).toBeInTheDocument()
  })
})
