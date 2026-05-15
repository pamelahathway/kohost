import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useStore } from '../../store'
import { defaultEntryFeeConfig } from '../../utils/sessionFee'
import { CheckInSheet } from './CheckInSheet'
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
    _undoSnapshot: null,
    undoLabel: null,
  })
}

function makeVisitor(name: string, exited = false): Visitor {
  return {
    id: 'v-' + name,
    name,
    enteredAt: Date.now() - 10 * 60_000,
    exitedAt: exited ? Date.now() : null,
    paidAmount: exited ? 1000 : null,
    paidAt: exited ? Date.now() : null,
    paidVia: exited ? 'cash' : null,
    amountOverridden: false,
    kohoFriend: false,
    deleted: false,
    updatedAt: Date.now(),
    deviceId: 'dev',
  }
}

describe('CheckInSheet', () => {
  beforeEach(resetStore)

  it('adds a visitor when the name is typed and Check in tapped', () => {
    const onClose = vi.fn()
    render(<CheckInSheet onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText(/visitor name/i), {
      target: { value: 'Anna' },
    })
    fireEvent.click(screen.getByRole('button', { name: /check in/i }))
    expect(useStore.getState().visitors.map((v) => v.name)).toContain('Anna')
    expect(onClose).toHaveBeenCalled()
  })

  it('does nothing when the input is empty (Check in disabled)', () => {
    const onClose = vi.fn()
    render(<CheckInSheet onClose={onClose} />)
    const checkInBtn = screen.getByRole('button', { name: /check in/i })
    expect(checkInBtn).toBeDisabled()
    fireEvent.click(checkInBtn)
    expect(useStore.getState().visitors).toHaveLength(0)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('trims whitespace before saving', () => {
    render(<CheckInSheet onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/visitor name/i), {
      target: { value: '  Anna  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /check in/i }))
    expect(useStore.getState().visitors[0].name).toBe('Anna')
  })

  it('Enter key commits the check-in', () => {
    render(<CheckInSheet onClose={() => {}} />)
    const input = screen.getByPlaceholderText(/visitor name/i)
    fireEvent.change(input, { target: { value: 'Bob' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(useStore.getState().visitors.map((v) => v.name)).toContain('Bob')
  })

  it('shows a duplicate-name message when the name matches an active visitor', () => {
    useStore.setState({ visitors: [makeVisitor('Anna')] })
    render(<CheckInSheet onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/visitor name/i), {
      target: { value: 'Anna' },
    })
    expect(screen.getByText(/already inside/i)).toBeInTheDocument()
  })

  it('disables the Check in button on a duplicate name', () => {
    useStore.setState({ visitors: [makeVisitor('Anna')] })
    render(<CheckInSheet onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/visitor name/i), {
      target: { value: 'Anna' },
    })
    expect(screen.getByRole('button', { name: /check in/i })).toBeDisabled()
  })

  it('Enter key does not commit a duplicate name', () => {
    useStore.setState({ visitors: [makeVisitor('Anna')] })
    render(<CheckInSheet onClose={() => {}} />)
    const input = screen.getByPlaceholderText(/visitor name/i)
    fireEvent.change(input, { target: { value: 'Anna' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(useStore.getState().visitors.filter((v) => v.name === 'Anna')).toHaveLength(1)
  })

  it('duplicate check ignores already-checked-out visitors', () => {
    useStore.setState({ visitors: [makeVisitor('Anna', /* exited */ true)] })
    render(<CheckInSheet onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/visitor name/i), {
      target: { value: 'Anna' },
    })
    expect(screen.queryByText(/already inside/i)).not.toBeInTheDocument()
  })

  it('duplicate check ignores deleted (tombstoned) visitors', () => {
    useStore.setState({ visitors: [{ ...makeVisitor('Anna'), deleted: true }] })
    render(<CheckInSheet onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/visitor name/i), {
      target: { value: 'Anna' },
    })
    expect(screen.queryByText(/already inside/i)).not.toBeInTheDocument()
  })

  it('duplicate check is case-insensitive', () => {
    useStore.setState({ visitors: [makeVisitor('Anna')] })
    render(<CheckInSheet onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/visitor name/i), {
      target: { value: 'ANNA' },
    })
    expect(screen.getByText(/already inside/i)).toBeInTheDocument()
  })

  it('blocks check-in when name matches an active visitor', () => {
    useStore.setState({ visitors: [makeVisitor('Anna')] })
    render(<CheckInSheet onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/visitor name/i), {
      target: { value: 'Anna' },
    })
    fireEvent.click(screen.getByRole('button', { name: /check in/i }))
    expect(useStore.getState().visitors.filter((v) => v.name === 'Anna')).toHaveLength(1)
  })

  it('unblocks when the user changes the name to something unique', () => {
    useStore.setState({ visitors: [makeVisitor('Anna')] })
    render(<CheckInSheet onClose={() => {}} />)
    const input = screen.getByPlaceholderText(/visitor name/i)
    fireEvent.change(input, { target: { value: 'Anna' } })
    expect(screen.getByRole('button', { name: /check in/i })).toBeDisabled()
    fireEvent.change(input, { target: { value: 'Anna B.' } })
    expect(screen.getByRole('button', { name: /check in/i })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /check in/i }))
    expect(useStore.getState().visitors.map((v) => v.name)).toContain('Anna B.')
  })
})
