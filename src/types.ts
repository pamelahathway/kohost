export interface Drink {
  id: string
  name: string
  price: number // integer cents
  categoryId: string
}

export interface DrinkCategory {
  id: string
  name: string
  icon: string // lucide icon name
  sortOrder: number
  drinks: Drink[]
}

export interface Guest {
  id: string
  name: string
  sortOrder: number
  paid: boolean
  paidAt: string | null
}

export interface OrderItem {
  guestId: string
  drinkId: string
  quantity: number
  createdAt: number // Date.now() timestamp
}

export interface PaidLineItem {
  drinkName: string
  categoryName: string
  quantity: number
  unitPrice: number // cents
  lineTotal: number // cents
}

export interface PaymentRecord {
  id: string
  guestId: string
  guestName: string
  items: PaidLineItem[]
  total: number // cents (tab total)
  amountPaid: number // cents (actual amount collected, may include tip)
  paidAt: string // ISO timestamp
}

export interface CartItem {
  guestId: string   // which guest this item is for
  drinkId: string
  drinkName: string
  categoryName: string
  unitPrice: number // cents
  quantity: number
}

// --- Session mode (time-based entry fee) ---

/** Snapshot of a payment that was undone by reopenVisitor — kept for audit. */
export interface ReopenRecord {
  at: number                                // ms epoch when the reopen happened
  reason: string                            // canonical or free-text reason
  previousAmount: number | null             // cents that were paid before reopen
  previousPaidVia: 'cash' | 'sumup' | null
  previousKohoFriend: boolean
}

export interface Visitor {
  id: string
  name: string
  enteredAt: number          // ms epoch
  exitedAt: number | null
  paidAmount: number | null  // cents; null = unpaid
  paidAt: number | null
  paidVia: 'cash' | 'sumup' | null
  amountOverridden: boolean  // true if staff edited the auto-calculated amount
  kohoFriend: boolean        // true if the staff marked this as a KoHo Friend at checkout
  reopenHistory: ReopenRecord[] // audit trail of reopened check-outs
  deleted: boolean           // tombstone flag — kept in array so other devices learn of deletion
  updatedAt: number          // for sync conflict resolution
  deviceId: string           // which phone last wrote this record
}

export interface FeeTier {
  id: string
  minStart: number    // minutes, inclusive
  minEnd: number      // minutes, exclusive — set high (e.g. 9999) for the topmost tier
  priceCents: number
}

export interface EntryFeeConfig {
  tiers: FeeTier[]
  // Price set by the "Becomes KoHo Friend" button at check-out (cents).
  kohoFriendPriceCents: number
  // Last-modified timestamp used for cross-device sync conflict resolution.
  // Bumped to Date.now() on every edit; 0 for unmodified defaults.
  lastModifiedAt: number
}

export type AppTab = 'order' | 'session' | 'guests' | 'dashboard' | 'setup'

export type EventMode = 'brunch' | 'session'
