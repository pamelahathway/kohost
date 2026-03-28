import { describe, it, expect, beforeEach } from 'vitest'
import {
  listSavedEvents,
  saveEvent,
  loadSavedEvent,
  deleteSavedEvent,
  importEventJSON,
  type EventData,
} from './eventStorage'

function makeEventData(name = 'Test Event'): EventData {
  return {
    eventName: name,
    categories: [{
      id: 'cat-1',
      name: 'Coffee',
      icon: 'coffee',
      sortOrder: 0,
      drinks: [{ id: 'drink-1', name: 'Espresso', price: 250, categoryId: 'cat-1' }],
    }],
    guests: [
      { id: 'guest-1', name: 'Alice', sortOrder: 0, paid: false, paidAt: null },
      { id: 'guest-2', name: 'Bob', sortOrder: 1, paid: true, paidAt: '2026-01-01T00:00:00Z' },
    ],
    orders: [{ guestId: 'guest-1', drinkId: 'drink-1', quantity: 2, createdAt: 1000 }],
    payments: [{
      id: 'pay-1',
      guestId: 'guest-2',
      guestName: 'Bob',
      items: [{ drinkName: 'Espresso', categoryName: 'Coffee', quantity: 1, unitPrice: 250, lineTotal: 250 }],
      total: 250,
      amountPaid: 300,
      paidAt: '2026-01-01T00:00:00Z',
    }],
  }
}

describe('eventStorage', () => {
  beforeEach(() => {
    // Clear all event-related localStorage keys
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('kohost-event') || key === 'kohost-events-index')) {
        keys.push(key)
      }
    }
    keys.forEach((k) => localStorage.removeItem(k))
  })

  it('starts with empty list', () => {
    expect(listSavedEvents()).toEqual([])
  })

  it('saves and lists an event', () => {
    const data = makeEventData('Brunch')
    saveEvent(data)
    const events = listSavedEvents()
    expect(events).toHaveLength(1)
    expect(events[0].name).toBe('Brunch')
    expect(events[0].guestCount).toBe(2)
  })

  it('loads a saved event', () => {
    const data = makeEventData('Dinner')
    const id = saveEvent(data)
    const loaded = loadSavedEvent(id)
    expect(loaded).not.toBeNull()
    expect(loaded!.eventName).toBe('Dinner')
    expect(loaded!.categories).toHaveLength(1)
    expect(loaded!.guests).toHaveLength(2)
    expect(loaded!.orders).toHaveLength(1)
    expect(loaded!.payments).toHaveLength(1)
  })

  it('deletes a saved event', () => {
    const id = saveEvent(makeEventData())
    expect(listSavedEvents()).toHaveLength(1)

    deleteSavedEvent(id)
    expect(listSavedEvents()).toHaveLength(0)
    expect(loadSavedEvent(id)).toBeNull()
  })

  it('saves multiple events, newest first', () => {
    saveEvent(makeEventData('First'))
    saveEvent(makeEventData('Second'))
    const events = listSavedEvents()
    expect(events).toHaveLength(2)
    expect(events[0].name).toBe('Second')
    expect(events[1].name).toBe('First')
  })

  it('returns null for non-existent event', () => {
    expect(loadSavedEvent('does-not-exist')).toBeNull()
  })
})

describe('importEventJSON', () => {
  it('parses valid event JSON', () => {
    const data = makeEventData('Import Test')
    const json = JSON.stringify({
      version: 1,
      type: 'kohost-event',
      exportedAt: new Date().toISOString(),
      ...data,
    })
    const result = importEventJSON(json)
    expect(result).not.toBeNull()
    expect(result!.eventName).toBe('Import Test')
    expect(result!.categories).toHaveLength(1)
    expect(result!.guests).toHaveLength(2)
  })

  it('returns null for invalid JSON', () => {
    expect(importEventJSON('{invalid')).toBeNull()
  })

  it('returns null for missing required fields', () => {
    expect(importEventJSON('{"foo": "bar"}')).toBeNull()
  })

  it('handles missing optional arrays', () => {
    const json = JSON.stringify({
      eventName: 'Minimal',
      categories: [],
      guests: [],
    })
    const result = importEventJSON(json)
    expect(result).not.toBeNull()
    expect(result!.orders).toEqual([])
    expect(result!.payments).toEqual([])
  })
})
