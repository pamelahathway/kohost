import type { DrinkCategory, Guest, OrderItem, PaymentRecord } from '../types'
import { generateId } from './generateId'

/** The persisted data of an event (matches what Zustand persists). */
export interface EventData {
  eventName: string
  categories: DrinkCategory[]
  guests: Guest[]
  orders: OrderItem[]
  payments: PaymentRecord[]
}

/** Metadata for listing saved events (stored in the index). */
export interface SavedEventMeta {
  id: string
  name: string
  guestCount: number
  savedAt: string // ISO timestamp
}

const INDEX_KEY = 'kohost-events-index'
const EVENT_PREFIX = 'kohost-event-'

/** List all saved events (metadata only). */
export function listSavedEvents(): SavedEventMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedEventMeta[]
  } catch {
    return []
  }
}

/** Save an event snapshot to localStorage. Returns the new event ID. */
export function saveEvent(data: EventData): string {
  const id = generateId()
  const meta: SavedEventMeta = {
    id,
    name: data.eventName,
    guestCount: data.guests.length,
    savedAt: new Date().toISOString(),
  }

  // Save the data blob
  localStorage.setItem(EVENT_PREFIX + id, JSON.stringify(data))

  // Update the index
  const index = listSavedEvents()
  index.unshift(meta) // newest first
  localStorage.setItem(INDEX_KEY, JSON.stringify(index))

  return id
}

/** Load a saved event's full data. Returns null if not found. */
export function loadSavedEvent(id: string): EventData | null {
  try {
    const raw = localStorage.getItem(EVENT_PREFIX + id)
    if (!raw) return null
    return JSON.parse(raw) as EventData
  } catch {
    return null
  }
}

/** Delete a saved event from localStorage. */
export function deleteSavedEvent(id: string): void {
  localStorage.removeItem(EVENT_PREFIX + id)
  const index = listSavedEvents().filter((e) => e.id !== id)
  localStorage.setItem(INDEX_KEY, JSON.stringify(index))
}

// --- JSON file export/import ---

interface EventExportFormat {
  version: number
  type: 'kohost-event'
  exportedAt: string
  eventName: string
  categories: DrinkCategory[]
  guests: Guest[]
  orders: OrderItem[]
  payments: PaymentRecord[]
}

/** Export event data as a downloadable JSON file. */
export function exportEventJSON(data: EventData): void {
  const exportData: EventExportFormat = {
    version: 1,
    type: 'kohost-event',
    exportedAt: new Date().toISOString(),
    ...data,
  }

  const slug = data.eventName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kohost-event-${slug}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Parse an imported event JSON file. Returns null if invalid. */
export function importEventJSON(text: string): EventData | null {
  try {
    const data = JSON.parse(text) as EventExportFormat
    if (!data.eventName || !Array.isArray(data.categories) || !Array.isArray(data.guests)) {
      return null
    }
    return {
      eventName: data.eventName,
      categories: data.categories,
      guests: data.guests,
      orders: data.orders ?? [],
      payments: data.payments ?? [],
    }
  } catch {
    return null
  }
}
