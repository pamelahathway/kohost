import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useStore } from '../../store'
import { defaultEntryFeeConfig } from '../../utils/sessionFee'
import { TopBar } from './TopBar'

function resetStore() {
  useStore.setState({
    eventName: 'My Event',
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

function renderTopBar(overrides: Partial<React.ComponentProps<typeof TopBar>> = {}) {
  const onTabChange = vi.fn()
  render(
    <TopBar
      currentTab="session"
      onTabChange={onTabChange}
      eventName={useStore.getState().eventName}
      eventMode={useStore.getState().eventMode}
      {...overrides}
    />
  )
  return { onTabChange }
}

describe('TopBar — inline rename', () => {
  beforeEach(resetStore)

  it('renders the event name as a tappable button by default', () => {
    renderTopBar()
    expect(
      screen.getByRole('button', { name: /my event/i })
    ).toBeInTheDocument()
  })

  it('tapping the name switches to an input with the current name', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /my event/i }))
    const input = screen.getByDisplayValue('My Event') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('Enter commits the new name to the store', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /my event/i }))
    const input = screen.getByDisplayValue('My Event')
    fireEvent.change(input, { target: { value: 'Summer Brunch 2026' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // Enter blurs → commit fires
    fireEvent.blur(input)
    expect(useStore.getState().eventName).toBe('Summer Brunch 2026')
  })

  it('blur commits the new name to the store', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /my event/i }))
    const input = screen.getByDisplayValue('My Event')
    fireEvent.change(input, { target: { value: 'Autumn Session' } })
    fireEvent.blur(input)
    expect(useStore.getState().eventName).toBe('Autumn Session')
  })

  it('Escape cancels the edit and keeps the original name', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /my event/i }))
    const input = screen.getByDisplayValue('My Event')
    fireEvent.change(input, { target: { value: 'Discarded' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(useStore.getState().eventName).toBe('My Event')
    // And the static button is back
    expect(screen.getByRole('button', { name: /my event/i })).toBeInTheDocument()
  })

  it('trims whitespace before saving', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /my event/i }))
    const input = screen.getByDisplayValue('My Event')
    fireEvent.change(input, { target: { value: '   Padded Name   ' } })
    fireEvent.blur(input)
    expect(useStore.getState().eventName).toBe('Padded Name')
  })

  it('does not save an empty name (keeps the existing one)', () => {
    renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /my event/i }))
    const input = screen.getByDisplayValue('My Event')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.blur(input)
    expect(useStore.getState().eventName).toBe('My Event')
  })
})

describe('TopBar — tabs', () => {
  beforeEach(resetStore)

  it('renders all five tabs in the expected order', () => {
    renderTopBar()
    const labels = ['Setup', 'Session', 'Brunch', 'Guests', 'Dashboard']
    const buttons = screen.getAllByRole('button')
    const tabButtonLabels = labels.filter((l) =>
      buttons.some((b) => b.textContent === l)
    )
    expect(tabButtonLabels).toEqual(labels)
  })

  it('clicking a tab fires onTabChange', () => {
    const { onTabChange } = renderTopBar()
    fireEvent.click(screen.getByRole('button', { name: /^dashboard$/i }))
    expect(onTabChange).toHaveBeenCalledWith('dashboard')
  })
})
