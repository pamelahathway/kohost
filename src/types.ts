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
  total: number // cents
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

export type AppTab = 'order' | 'guests' | 'dashboard' | 'setup'
