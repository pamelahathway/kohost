import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  DrinkCategory,
  Drink,
  Guest,
  OrderItem,
  PaymentRecord,
  PaidLineItem,
  CartItem,
} from './types'
import { generateId } from './utils/generateId'
import { saveEvent as saveEventToStorage, type EventData } from './utils/eventStorage'

interface UndoSnapshot {
  orders: OrderItem[]
  payments: PaymentRecord[]
  guests: Guest[]
  cart: CartItem[]
  lastActiveGuestId: string | null
}

interface StoreState {
  eventName: string
  setupComplete: boolean
  cloudBackupUrl: string
  cloudBackupSecret: string
  categories: DrinkCategory[]
  guests: Guest[]
  orders: OrderItem[]
  payments: PaymentRecord[]
  cart: CartItem[]
  lastActiveGuestId: string | null
  navigateToGuestId: string | null

  // Navigation
  setNavigateToGuestId: (guestId: string | null) => void

  // Undo
  _undoSnapshot: UndoSnapshot | null
  undoLabel: string | null
  undo: () => void
  _snapshot: (label: string) => void

  // Event
  setEventName: (name: string) => void
  setSetupComplete: (v: boolean) => void
  setCloudBackupUrl: (url: string) => void
  setCloudBackupSecret: (secret: string) => void

  // Categories
  addCategory: (name: string, icon: string) => void
  updateCategory: (id: string, updates: Partial<Pick<DrinkCategory, 'name' | 'icon' | 'sortOrder'>>) => void
  removeCategory: (id: string) => void
  reorderCategories: (ids: string[]) => void

  // Drinks
  addDrink: (categoryId: string, name: string, price: number) => void
  updateDrink: (id: string, updates: Partial<Pick<Drink, 'name' | 'price'>>) => void
  removeDrink: (id: string) => void

  // Guests
  addGuest: (name: string) => void
  updateGuest: (id: string, name: string) => void
  removeGuest: (id: string) => void
  reorderGuests: (ids: string[]) => void

  // Cart
  addToCart: (drinkId: string) => void
  decrementCart: (drinkId: string) => void
  removeFromCart: (drinkId: string) => void
  clearCart: () => void
  assignCartToGuest: (guestId: string) => void

  // Direct guest drink management (used by grid modal)
  addDrinkToGuest: (guestId: string, drinkId: string) => void
  removeDrinkFromGuest: (guestId: string, drinkId: string) => void
  getCategoryCartCount: (guestId: string, categoryId: string) => number

  // Direct order editing (used by TabDetail edit mode — no cart involvement)
  incrementOrder: (guestId: string, drinkId: string) => void
  decrementOrder: (guestId: string, drinkId: string) => void
  setOrderQuantity: (guestId: string, drinkId: string, quantity: number) => void

  // Menu import
  replaceMenu: (categories: DrinkCategory[]) => void

  // Reset
  resetEvent: () => void

  // Event management
  saveCurrentEvent: () => string
  loadEvent: (data: EventData) => void
  startNewEvent: () => void

  // Payments
  markGuestPaid: (guestId: string, amountPaid?: number) => void
  reopenGuestTab: (guestId: string) => void

  // Derived helpers
  getGuestTotal: (guestId: string) => number
  getGuestLineItems: (guestId: string) => Array<{ drinkId: string; drinkName: string; categoryName: string; quantity: number; unitPrice: number; lineTotal: number }>
  getEventTotal: () => number
  getCartTotal: () => number
  getCategoryCountForGuest: (guestId: string, categoryId: string) => number
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      eventName: 'My Event',
      setupComplete: false,
      cloudBackupUrl: '',
      cloudBackupSecret: '',
      categories: [],
      guests: [],
      orders: [],
      payments: [],
      cart: [],
      lastActiveGuestId: null,
      navigateToGuestId: null,

      // Navigation
      setNavigateToGuestId: (guestId) => set({ navigateToGuestId: guestId }),

      // Undo
      _undoSnapshot: null,
      undoLabel: null,
      _snapshot: (label) => {
        const s = get()
        set({
          _undoSnapshot: {
            orders: s.orders,
            payments: s.payments,
            guests: s.guests,
            cart: s.cart,
            lastActiveGuestId: s.lastActiveGuestId,
          },
          undoLabel: label,
        })
      },
      undo: () => {
        const snap = get()._undoSnapshot
        if (!snap) return
        set({
          orders: snap.orders,
          payments: snap.payments,
          guests: snap.guests,
          cart: snap.cart,
          lastActiveGuestId: snap.lastActiveGuestId,
          _undoSnapshot: null,
          undoLabel: null,
        })
      },

      setEventName: (name) => set({ eventName: name }),
      setSetupComplete: (v) => set({ setupComplete: v }),
      setCloudBackupUrl: (url) => set({ cloudBackupUrl: url }),
      setCloudBackupSecret: (secret) => set({ cloudBackupSecret: secret }),

      // --- Categories ---
      addCategory: (name, icon) =>
        set((s) => ({
          categories: [
            ...s.categories,
            { id: generateId(), name, icon, sortOrder: s.categories.length, drinks: [] },
          ],
        })),

      updateCategory: (id, updates) =>
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      removeCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          // clean up orders for drinks in this category
          orders: s.orders.filter(
            (o) => !s.categories.find((c) => c.id === id)?.drinks.some((d) => d.id === o.drinkId)
          ),
        })),

      reorderCategories: (ids) =>
        set((s) => ({
          categories: ids
            .map((id, i) => {
              const cat = s.categories.find((c) => c.id === id)!
              return { ...cat, sortOrder: i }
            })
            .filter(Boolean),
        })),

      // --- Drinks ---
      addDrink: (categoryId, name, price) =>
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === categoryId
              ? { ...c, drinks: [...c.drinks, { id: generateId(), name, price, categoryId }] }
              : c
          ),
        })),

      updateDrink: (id, updates) =>
        set((s) => ({
          categories: s.categories.map((c) => ({
            ...c,
            drinks: c.drinks.map((d) => (d.id === id ? { ...d, ...updates } : d)),
          })),
        })),

      removeDrink: (id) =>
        set((s) => ({
          categories: s.categories.map((c) => ({
            ...c,
            drinks: c.drinks.filter((d) => d.id !== id),
          })),
          orders: s.orders.filter((o) => o.drinkId !== id),
        })),

      // --- Guests ---
      addGuest: (name) =>
        set((s) => ({
          guests: [
            ...s.guests,
            { id: generateId(), name, sortOrder: s.guests.length, paid: false, paidAt: null },
          ],
        })),

      updateGuest: (id, name) =>
        set((s) => ({
          guests: s.guests.map((g) => (g.id === id ? { ...g, name } : g)),
        })),

      removeGuest: (id) =>
        set((s) => ({
          guests: s.guests.filter((g) => g.id !== id),
          orders: s.orders.filter((o) => o.guestId !== id),
        })),

      reorderGuests: (ids) =>
        set((s) => ({
          guests: ids
            .map((id, i) => {
              const g = s.guests.find((g) => g.id === id)!
              return { ...g, sortOrder: i }
            })
            .filter(Boolean),
        })),

      // --- Cart ---
      addToCart: (drinkId) => {
        const { categories, cart } = get()
        const allDrinks = categories.flatMap((c) =>
          c.drinks.map((d) => ({ ...d, categoryName: c.name }))
        )
        const drink = allDrinks.find((d) => d.id === drinkId)
        if (!drink) return

        const existing = cart.find((item) => item.drinkId === drinkId)
        if (existing) {
          set({ cart: cart.map((item) => item.drinkId === drinkId ? { ...item, quantity: item.quantity + 1 } : item) })
        } else {
          set({
            cart: [
              ...cart,
              {
                guestId: '',
                drinkId,
                drinkName: drink.name,
                categoryName: drink.categoryName,
                unitPrice: drink.price,
                quantity: 1,
              },
            ],
          })
        }
      },

      decrementCart: (drinkId) => {
        const { cart } = get()
        const existing = cart.find((item) => item.drinkId === drinkId)
        if (!existing) return
        if (existing.quantity <= 1) {
          set({ cart: cart.filter((item) => item.drinkId !== drinkId) })
        } else {
          set({ cart: cart.map((item) => item.drinkId === drinkId ? { ...item, quantity: item.quantity - 1 } : item) })
        }
      },

      removeFromCart: (drinkId) =>
        set((s) => ({ cart: s.cart.filter((item) => item.drinkId !== drinkId) })),

      clearCart: () => {
        get()._snapshot('Undo finish order')
        set({ cart: [], lastActiveGuestId: null })
      },

      assignCartToGuest: (guestId) => {
        const { cart, orders } = get()
        if (cart.length === 0) return

        const newOrders = [...orders]
        for (const cartItem of cart) {
          const existing = newOrders.find(
            (o) => o.guestId === guestId && o.drinkId === cartItem.drinkId
          )
          if (existing) {
            existing.quantity += cartItem.quantity
          } else {
            newOrders.push({ guestId, drinkId: cartItem.drinkId, quantity: cartItem.quantity, createdAt: Date.now() })
          }
        }
        set({ orders: newOrders, cart: [] })
      },

      // --- Direct guest drink management ---
      addDrinkToGuest: (guestId, drinkId) => {
        const { orders, categories, cart, guests } = get()
        // Update committed orders
        const existing = orders.find((o) => o.guestId === guestId && o.drinkId === drinkId)
        const newOrders = existing
          ? orders.map((o) => o.guestId === guestId && o.drinkId === drinkId ? { ...o, quantity: o.quantity + 1 } : o)
          : [...orders, { guestId, drinkId, quantity: 1, createdAt: Date.now() }]
        // If guest was marked paid, move them back to outstanding
        const guest = guests.find((g) => g.id === guestId)
        const newGuests = guest?.paid
          ? guests.map((g) => g.id === guestId ? { ...g, paid: false, paidAt: null } : g)
          : guests
        // Update cart — keyed by guestId + drinkId
        const allDrinks = categories.flatMap((c) => c.drinks.map((d) => ({ ...d, categoryName: c.name })))
        const drink = allDrinks.find((d) => d.id === drinkId)
        if (!drink) { set({ orders: newOrders, guests: newGuests }); return }
        const cartExisting = cart.find((i) => i.guestId === guestId && i.drinkId === drinkId)
        const newCart = cartExisting
          ? cart.map((i) => i.guestId === guestId && i.drinkId === drinkId ? { ...i, quantity: i.quantity + 1 } : i)
          : [...cart, { guestId, drinkId, drinkName: drink.name, categoryName: drink.categoryName, unitPrice: drink.price, quantity: 1 }]
        set({ orders: newOrders, cart: newCart, guests: newGuests, lastActiveGuestId: guestId })
      },

      removeDrinkFromGuest: (guestId, drinkId) => {
        const { orders, cart, guests, payments } = get()
        // Only remove from cart if it was added in this session
        const cartExisting = cart.find((i) => i.guestId === guestId && i.drinkId === drinkId)
        if (!cartExisting) return  // not in current order, nothing to remove
        const newCart = cartExisting.quantity <= 1
          ? cart.filter((i) => !(i.guestId === guestId && i.drinkId === drinkId))
          : cart.map((i) => i.guestId === guestId && i.drinkId === drinkId ? { ...i, quantity: i.quantity - 1 } : i)
        // Also remove from committed orders
        const existing = orders.find((o) => o.guestId === guestId && o.drinkId === drinkId)
        const newOrders = !existing
          ? orders
          : existing.quantity <= 1
            ? orders.filter((o) => !(o.guestId === guestId && o.drinkId === drinkId))
            : orders.map((o) => o.guestId === guestId && o.drinkId === drinkId ? { ...o, quantity: o.quantity - 1 } : o)
        // Re-mark as paid if guest has no remaining orders but has payment history
        const guestHasOrders = newOrders.some((o) => o.guestId === guestId && o.quantity > 0)
        const guest = guests.find((g) => g.id === guestId)
        const hasPaidBefore = payments.some((p) => p.guestId === guestId)
        const newGuests = (!guestHasOrders && guest && !guest.paid && hasPaidBefore)
          ? guests.map((g) => g.id === guestId ? { ...g, paid: true, paidAt: new Date().toISOString() } : g)
          : guests
        set({ orders: newOrders, cart: newCart, guests: newGuests })
      },

      incrementOrder: (guestId, drinkId) => {
        const { orders } = get()
        const existing = orders.find((o) => o.guestId === guestId && o.drinkId === drinkId)
        if (existing) {
          set({ orders: orders.map((o) => o.guestId === guestId && o.drinkId === drinkId ? { ...o, quantity: o.quantity + 1 } : o) })
        } else {
          set({ orders: [...orders, { guestId, drinkId, quantity: 1, createdAt: Date.now() }] })
        }
      },

      decrementOrder: (guestId, drinkId) => {
        const { orders, guests, payments } = get()
        const existing = orders.find((o) => o.guestId === guestId && o.drinkId === drinkId)
        if (!existing) return
        const newOrders = existing.quantity <= 1
          ? orders.filter((o) => !(o.guestId === guestId && o.drinkId === drinkId))
          : orders.map((o) => o.guestId === guestId && o.drinkId === drinkId ? { ...o, quantity: o.quantity - 1 } : o)
        const guestHasOrders = newOrders.some((o) => o.guestId === guestId && o.quantity > 0)
        const guest = guests.find((g) => g.id === guestId)
        const hasPaidBefore = payments.some((p) => p.guestId === guestId)
        const newGuests = (!guestHasOrders && guest && !guest.paid && hasPaidBefore)
          ? guests.map((g) => g.id === guestId ? { ...g, paid: true, paidAt: new Date().toISOString() } : g)
          : guests
        set({ orders: newOrders, guests: newGuests })
      },

      setOrderQuantity: (guestId, drinkId, quantity) => {
        const { orders, guests, payments } = get()
        const newOrders = quantity <= 0
          ? orders.filter((o) => !(o.guestId === guestId && o.drinkId === drinkId))
          : (() => {
              const existing = orders.find((o) => o.guestId === guestId && o.drinkId === drinkId)
              if (existing) {
                return orders.map((o) => o.guestId === guestId && o.drinkId === drinkId ? { ...o, quantity } : o)
              }
              return [...orders, { guestId, drinkId, quantity, createdAt: Date.now() }]
            })()
        const guestHasOrders = newOrders.some((o) => o.guestId === guestId && o.quantity > 0)
        const guest = guests.find((g) => g.id === guestId)
        const hasPaidBefore = payments.some((p) => p.guestId === guestId)
        const newGuests = (!guestHasOrders && guest && !guest.paid && hasPaidBefore)
          ? guests.map((g) => g.id === guestId ? { ...g, paid: true, paidAt: new Date().toISOString() } : g)
          : guests
        set({ orders: newOrders, guests: newGuests })
      },

      getCategoryCartCount: (guestId, categoryId) => {
        const { cart, categories } = get()
        const category = categories.find((c) => c.id === categoryId)
        if (!category) return 0
        const drinkIds = new Set(category.drinks.map((d) => d.id))
        return cart
          .filter((i) => i.guestId === guestId && drinkIds.has(i.drinkId))
          .reduce((sum, i) => sum + i.quantity, 0)
      },

      // --- Reset ---
      resetEvent: () =>
        set({
          eventName: 'My Event',
          guests: [],
          orders: [],
          payments: [],
          cart: [],
          lastActiveGuestId: null,
        }),

      // --- Event management ---
      saveCurrentEvent: () => {
        const { eventName, categories, guests, orders, payments } = get()
        return saveEventToStorage({ eventName, categories, guests, orders, payments })
      },

      loadEvent: (data) =>
        set({
          eventName: data.eventName,
          categories: data.categories,
          guests: data.guests,
          orders: data.orders,
          payments: data.payments,
          cart: [],
          lastActiveGuestId: null,
          _undoSnapshot: null,
          undoLabel: null,
          setupComplete: true,
        }),

      startNewEvent: () =>
        set({
          eventName: 'My Event',
          setupComplete: false,
          categories: [],
          guests: [],
          orders: [],
          payments: [],
          cart: [],
          lastActiveGuestId: null,
          _undoSnapshot: null,
          undoLabel: null,
        }),

      // --- Menu import ---
      replaceMenu: (newCategories) => {
        const { orders } = get()
        const allNewDrinkIds = new Set(newCategories.flatMap((c) => c.drinks.map((d) => d.id)))
        // Remove orders for drinks that no longer exist
        const cleanedOrders = orders.filter((o) => allNewDrinkIds.has(o.drinkId))
        set({ categories: newCategories, orders: cleanedOrders })
      },

      // --- Payments ---
      markGuestPaid: (guestId, amountPaid?) => {
        get()._snapshot('Undo mark as paid')
        const { orders, categories, guests, payments } = get()
        const guest = guests.find((g) => g.id === guestId)
        if (!guest) return

        const allDrinks = categories.flatMap((c) =>
          c.drinks.map((d) => ({ ...d, categoryName: c.name }))
        )
        const guestOrders = orders.filter((o) => o.guestId === guestId && o.quantity > 0)
        const items: PaidLineItem[] = guestOrders.map((o) => {
          const drink = allDrinks.find((d) => d.id === o.drinkId)!
          return {
            drinkName: drink?.name ?? 'Unknown',
            categoryName: drink?.categoryName ?? '',
            quantity: o.quantity,
            unitPrice: drink?.price ?? 0,
            lineTotal: (drink?.price ?? 0) * o.quantity,
          }
        })

        const total = items.reduce((sum, i) => sum + i.lineTotal, 0)
        const record: PaymentRecord = {
          id: generateId(),
          guestId,
          guestName: guest.name,
          items,
          total,
          amountPaid: amountPaid ?? total,
          paidAt: new Date().toISOString(),
        }

        set({
          payments: [...payments, record],
          orders: orders.filter((o) => o.guestId !== guestId),
          guests: guests.map((g) =>
            g.id === guestId ? { ...g, paid: true, paidAt: new Date().toISOString() } : g
          ),
        })
      },

      reopenGuestTab: (guestId) =>
        set((s) => ({
          guests: s.guests.map((g) =>
            g.id === guestId ? { ...g, paid: false, paidAt: null } : g
          ),
        })),

      // --- Derived ---
      getGuestTotal: (guestId) => {
        const { orders, categories } = get()
        const allDrinks = categories.flatMap((c) => c.drinks)
        return orders
          .filter((o) => o.guestId === guestId && o.quantity > 0)
          .reduce((sum, o) => {
            const drink = allDrinks.find((d) => d.id === o.drinkId)
            return sum + (drink?.price ?? 0) * o.quantity
          }, 0)
      },

      getGuestLineItems: (guestId) => {
        const { orders, categories } = get()
        const allDrinks = categories.flatMap((c) =>
          c.drinks.map((d) => ({ ...d, categoryName: c.name }))
        )
        return orders
          .filter((o) => o.guestId === guestId && o.quantity > 0)
          .map((o) => {
            const drink = allDrinks.find((d) => d.id === o.drinkId)
            return {
              drinkId: o.drinkId,
              drinkName: drink?.name ?? 'Unknown',
              categoryName: drink?.categoryName ?? '',
              quantity: o.quantity,
              unitPrice: drink?.price ?? 0,
              lineTotal: (drink?.price ?? 0) * o.quantity,
            }
          })
      },

      getEventTotal: () => {
        const { guests, orders, categories } = get()
        const allDrinks = categories.flatMap((c) => c.drinks)
        return orders
          .filter((o) => {
            const guest = guests.find((g) => g.id === o.guestId)
            return o.quantity > 0 && guest && !guest.paid
          })
          .reduce((sum, o) => {
            const drink = allDrinks.find((d) => d.id === o.drinkId)
            return sum + (drink?.price ?? 0) * o.quantity
          }, 0)
      },

      getCartTotal: () => {
        const { cart } = get()
        return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      },

      getCategoryCountForGuest: (guestId, categoryId) => {
        const { orders, categories } = get()
        const category = categories.find((c) => c.id === categoryId)
        if (!category) return 0
        const drinkIds = new Set(category.drinks.map((d) => d.id))
        return orders
          .filter((o) => o.guestId === guestId && drinkIds.has(o.drinkId) && o.quantity > 0)
          .reduce((sum, o) => sum + o.quantity, 0)
      },
    }),
    {
      name: 'kohost-tab-tracker',
      version: 2,
      // Don't persist cart — it's transient
      partialize: (state) => ({
        eventName: state.eventName,
        setupComplete: state.setupComplete,
        cloudBackupUrl: state.cloudBackupUrl,
        cloudBackupSecret: state.cloudBackupSecret,
        categories: state.categories,
        guests: state.guests,
        orders: state.orders,
        payments: state.payments,
      }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>
        if (version < 2) {
          // Add amountPaid to existing payment records (default to total)
          const payments = (state.payments as PaymentRecord[]) ?? []
          state.payments = payments.map((p) => ({
            ...p,
            amountPaid: p.amountPaid ?? p.total,
          }))
        }
        return state as never
      },
    }
  )
)
