import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useStore } from '../../store'
import { defaultEntryFeeConfig } from '../../utils/sessionFee'
import { SessionScreen } from './SessionScreen'
import type { Visitor } from '../../types'

const TEN_MIN = 10 * 60_000
const THIRTY_MIN = 30 * 60_000

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

function makeVisitor(name: string, opts: Partial<Visitor> = {}): Visitor {
  return {
    id: 'v-' + name,
    name,
    enteredAt: Date.now() - TEN_MIN,
    exitedAt: null,
    paidAmount: null,
    paidAt: null,
    paidVia: null,
    amountOverridden: false,
    kohoFriend: false,
    reopenHistory: [],
    deleted: false,
    updatedAt: Date.now(),
    deviceId: 'dev',
    ...opts,
  }
}

describe('SessionScreen — empty state', () => {
  beforeEach(resetStore)

  it('renders the ModeEmptyState when eventMode is brunch', () => {
    useStore.setState({ eventMode: 'brunch' })
    render(<SessionScreen />)
    expect(screen.getByText(/this event is in brunch mode/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open setup/i })).toBeInTheDocument()
  })

  it('renders the ModeEmptyState when eventMode is null', () => {
    useStore.setState({ eventMode: null })
    render(<SessionScreen />)
    expect(screen.getByText(/no session in progress/i)).toBeInTheDocument()
  })

  it('clicking "Open Setup" requests navigation via the store', () => {
    useStore.setState({ eventMode: null })
    render(<SessionScreen />)
    fireEvent.click(screen.getByRole('button', { name: /open setup/i }))
    expect(useStore.getState().requestedTab).toBe('setup')
  })
})

describe('SessionScreen — active visitors (Inside)', () => {
  beforeEach(resetStore)

  it('shows the empty-list message when no one is inside', () => {
    render(<SessionScreen />)
    expect(screen.getByText(/no one is inside/i)).toBeInTheDocument()
  })

  it('lists active visitors with their live fee', () => {
    useStore.setState({
      visitors: [makeVisitor('Anna', { enteredAt: Date.now() - THIRTY_MIN })],
    })
    render(<SessionScreen />)
    expect(screen.getByText('Anna')).toBeInTheDocument()
    // Anna stayed 30m → tier 2 = €10. €10.00 appears in two places: the
    // "Owed now" stats tile and the visitor row itself. Both legitimate.
    const matches = screen.getAllByText('€10.00')
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('shows the count of active visitors in the stats bar', () => {
    useStore.setState({
      visitors: [makeVisitor('Anna'), makeVisitor('Bob')],
    })
    render(<SessionScreen />)
    // "Inside" appears twice — once as the stats-tile label and once as the
    // section header. The stats-tile parent should contain the count "2".
    const insideLabels = screen.getAllByText(/^inside$/i)
    const statsTileLabel = insideLabels.find((el) =>
      el.parentElement?.textContent?.match(/^Inside2$/)
    )
    expect(statsTileLabel).toBeDefined()
  })

  it('filters out deleted (tombstoned) visitors from the active list', () => {
    useStore.setState({
      visitors: [
        makeVisitor('Anna'),
        makeVisitor('Ghost', { deleted: true }),
      ],
    })
    render(<SessionScreen />)
    expect(screen.getByText('Anna')).toBeInTheDocument()
    expect(screen.queryByText('Ghost')).not.toBeInTheDocument()
  })
})

describe('SessionScreen — paid visitors', () => {
  beforeEach(resetStore)

  it('shows the Paid section when there are paid visitors', () => {
    useStore.setState({
      visitors: [
        makeVisitor('Carla', {
          exitedAt: Date.now(),
          paidAt: Date.now(),
          paidAmount: 1000,
          paidVia: 'cash',
        }),
      ],
    })
    render(<SessionScreen />)
    expect(screen.getByText(/^paid$/i)).toBeInTheDocument()
    expect(screen.getByText('Carla')).toBeInTheDocument()
    expect(screen.getByText('€10.00')).toBeInTheDocument()
  })

  it('does not render the Paid section when no one has paid yet', () => {
    useStore.setState({ visitors: [makeVisitor('Anna')] })
    render(<SessionScreen />)
    expect(screen.queryByText(/^paid$/i)).not.toBeInTheDocument()
  })

  it('renders the KoHo badge on paid KoHo Friend rows', () => {
    useStore.setState({
      visitors: [
        makeVisitor('Dan', {
          exitedAt: Date.now(),
          paidAt: Date.now(),
          paidAmount: 2500,
          paidVia: 'cash',
          kohoFriend: true,
        }),
      ],
    })
    render(<SessionScreen />)
    // The badge text is "KoHo"
    expect(screen.getByText(/^koho$/i)).toBeInTheDocument()
  })

  it('does NOT render the KoHo badge on regular paid rows', () => {
    useStore.setState({
      visitors: [
        makeVisitor('Eve', {
          exitedAt: Date.now(),
          paidAt: Date.now(),
          paidAmount: 1000,
          paidVia: 'cash',
          kohoFriend: false,
        }),
      ],
    })
    render(<SessionScreen />)
    expect(screen.queryByText(/^koho$/i)).not.toBeInTheDocument()
  })
})

describe('SessionScreen — Add visitor', () => {
  beforeEach(resetStore)

  it('clicking the Add visitor button opens the CheckInSheet', () => {
    render(<SessionScreen />)
    fireEvent.click(screen.getByRole('button', { name: /add visitor/i }))
    // CheckInSheet renders an input with the visitor-name placeholder
    expect(screen.getByPlaceholderText(/visitor name/i)).toBeInTheDocument()
  })
})

describe('SessionScreen — Reopen flow', () => {
  beforeEach(resetStore)

  it('tapping a paid row opens the ReopenSheet for that visitor', () => {
    useStore.setState({
      visitors: [
        makeVisitor('Carla', {
          exitedAt: Date.now(),
          paidAt: Date.now(),
          paidAmount: 1000,
          paidVia: 'cash',
        }),
      ],
    })
    render(<SessionScreen />)
    fireEvent.click(screen.getByRole('button', { name: /Carla/i }))
    // ReopenSheet renders a "Reopen check-in" confirm button at the bottom
    expect(screen.getByRole('button', { name: /reopen check-in/i })).toBeInTheDocument()
    // And a reason picker
    expect(screen.getByLabelText(/marked paid by mistake/i)).toBeInTheDocument()
  })

  it('renders the undo toast when pendingUndoVisitorId is set', () => {
    useStore.setState({
      visitors: [
        makeVisitor('Dan', {
          exitedAt: Date.now(),
          paidAt: Date.now(),
          paidAmount: 1000,
          paidVia: 'cash',
        }),
      ],
      pendingUndoVisitorId: 'v-Dan',
    })
    render(<SessionScreen />)
    expect(screen.getByText(/marked paid/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
  })

  it('tapping Undo in the toast reopens the visitor with "Marked paid by mistake"', () => {
    useStore.setState({
      visitors: [
        makeVisitor('Eve', {
          exitedAt: Date.now(),
          paidAt: Date.now(),
          paidAmount: 1000,
          paidVia: 'cash',
        }),
      ],
      pendingUndoVisitorId: 'v-Eve',
    })
    render(<SessionScreen />)
    fireEvent.click(screen.getByRole('button', { name: /undo/i }))
    const v = useStore.getState().visitors[0]
    expect(v.exitedAt).toBeNull()
    expect(v.paidAmount).toBeNull()
    expect(v.reopenHistory[0].reason).toBe('Marked paid by mistake')
    expect(v.reopenHistory[0].previousAmount).toBe(1000)
  })
})
