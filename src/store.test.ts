import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './store'

// Helper to reset store before each test
function resetStore() {
  useStore.setState({
    eventName: 'Test Event',
    setupComplete: false,
    categories: [],
    guests: [],
    orders: [],
    payments: [],
    cart: [],
    lastActiveGuestId: null,
    navigateToGuestId: null,
    _undoSnapshot: null,
    undoLabel: null,
  })
}

// Helper to set up a basic event with categories, drinks, and guests
function setupBasicEvent() {
  const store = useStore.getState()
  store.addCategory('Coffee', 'coffee')
  store.addCategory('Wine', 'wine')
  store.addGuest('Alice')
  store.addGuest('Bob')

  // Add drinks to categories
  const state = useStore.getState()
  const coffeeCategory = state.categories[0]
  const wineCategory = state.categories[1]
  store.addDrink(coffeeCategory.id, 'Espresso', 250)
  store.addDrink(coffeeCategory.id, 'Latte', 400)
  store.addDrink(wineCategory.id, 'Red Wine', 600)

  return useStore.getState()
}

describe('Store - Categories', () => {
  beforeEach(resetStore)

  it('adds a category', () => {
    useStore.getState().addCategory('Coffee', 'coffee')
    const { categories } = useStore.getState()
    expect(categories).toHaveLength(1)
    expect(categories[0].name).toBe('Coffee')
    expect(categories[0].icon).toBe('coffee')
    expect(categories[0].sortOrder).toBe(0)
  })

  it('removes a category and cleans up orders', () => {
    const state = setupBasicEvent()
    const coffeeCategory = state.categories[0]
    const espresso = coffeeCategory.drinks[0]
    const alice = state.guests[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    expect(useStore.getState().orders).toHaveLength(1)

    useStore.getState().removeCategory(coffeeCategory.id)
    expect(useStore.getState().categories).toHaveLength(1)
    expect(useStore.getState().orders).toHaveLength(0)
  })
})

describe('Store - Drinks', () => {
  beforeEach(resetStore)

  it('adds a drink to a category', () => {
    useStore.getState().addCategory('Coffee', 'coffee')
    const categoryId = useStore.getState().categories[0].id
    useStore.getState().addDrink(categoryId, 'Espresso', 250)

    const category = useStore.getState().categories[0]
    expect(category.drinks).toHaveLength(1)
    expect(category.drinks[0].name).toBe('Espresso')
    expect(category.drinks[0].price).toBe(250)
  })

  it('removes a drink and cleans up orders', () => {
    const state = setupBasicEvent()
    const espresso = state.categories[0].drinks[0]
    const alice = state.guests[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    expect(useStore.getState().orders).toHaveLength(1)

    useStore.getState().removeDrink(espresso.id)
    expect(useStore.getState().orders).toHaveLength(0)
  })
})

describe('Store - Guests', () => {
  beforeEach(resetStore)

  it('adds a guest', () => {
    useStore.getState().addGuest('Alice')
    const { guests } = useStore.getState()
    expect(guests).toHaveLength(1)
    expect(guests[0].name).toBe('Alice')
    expect(guests[0].paid).toBe(false)
  })

  it('removes a guest and cleans up orders', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.getState().removeGuest(alice.id)

    expect(useStore.getState().guests).toHaveLength(1)
    expect(useStore.getState().orders).toHaveLength(0)
  })
})

describe('Store - Direct ordering (addDrinkToGuest / removeDrinkFromGuest)', () => {
  beforeEach(resetStore)

  it('adds a drink to a guest', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    const orders = useStore.getState().orders
    expect(orders).toHaveLength(1)
    expect(orders[0].guestId).toBe(alice.id)
    expect(orders[0].drinkId).toBe(espresso.id)
    expect(orders[0].quantity).toBe(1)
  })

  it('increments quantity on repeated add', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    const orders = useStore.getState().orders
    expect(orders).toHaveLength(1)
    expect(orders[0].quantity).toBe(2)
  })

  it('removes a drink from a guest', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.getState().removeDrinkFromGuest(alice.id, espresso.id)

    const orders = useStore.getState().orders
    expect(orders).toHaveLength(1)
    expect(orders[0].quantity).toBe(1)
  })

  it('reopens paid guest when drink is added', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    // Add drink, pay, then add another
    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.getState().markGuestPaid(alice.id)
    expect(useStore.getState().guests[0].paid).toBe(true)

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    expect(useStore.getState().guests[0].paid).toBe(false)
  })
})

describe('Store - Payment flow', () => {
  beforeEach(resetStore)

  it('marks a guest as paid and creates payment record', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    // Clear cart so it doesn't interfere
    useStore.setState({ cart: [] })
    useStore.getState().markGuestPaid(alice.id)

    const { guests, payments, orders } = useStore.getState()
    const alice2 = guests.find(g => g.id === alice.id)!
    expect(alice2.paid).toBe(true)
    expect(alice2.paidAt).not.toBeNull()

    // Payment record created
    expect(payments).toHaveLength(1)
    expect(payments[0].guestName).toBe('Alice')
    expect(payments[0].total).toBe(500) // 2 x 250
    expect(payments[0].amountPaid).toBe(500) // defaults to total
    expect(payments[0].items).toHaveLength(1)
    expect(payments[0].items[0].drinkName).toBe('Espresso')
    expect(payments[0].items[0].quantity).toBe(2)

    // Orders cleared for this guest
    expect(orders.filter(o => o.guestId === alice.id)).toHaveLength(0)
  })

  it('reopens a guest tab', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.setState({ cart: [] })
    useStore.getState().markGuestPaid(alice.id)
    useStore.getState().reopenGuestTab(alice.id)

    const guest = useStore.getState().guests.find(g => g.id === alice.id)!
    expect(guest.paid).toBe(false)
    expect(guest.paidAt).toBeNull()
  })

  it('records custom amountPaid for tips', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id) // 250 cents
    useStore.setState({ cart: [] })
    useStore.getState().markGuestPaid(alice.id, 300) // paid 300, tab was 250

    const { payments } = useStore.getState()
    expect(payments[0].total).toBe(250)
    expect(payments[0].amountPaid).toBe(300)
    // Tip = 300 - 250 = 50
  })

  it('marks guest with no orders as paid (no payment needed)', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]

    useStore.getState().markGuestPaid(alice.id)
    const { guests, payments } = useStore.getState()
    expect(guests[0].paid).toBe(true)
    expect(payments).toHaveLength(1)
    expect(payments[0].total).toBe(0)
  })
})

describe('Store - Auto-restore paid status', () => {
  beforeEach(resetStore)

  it('re-marks guest as paid when all orders removed after reopen', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    // Pay, reopen, add drink, then remove it
    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.setState({ cart: [] })
    useStore.getState().markGuestPaid(alice.id)
    useStore.getState().reopenGuestTab(alice.id)

    // Add a drink then remove via decrementOrder
    useStore.getState().incrementOrder(alice.id, espresso.id)
    useStore.getState().decrementOrder(alice.id, espresso.id)

    expect(useStore.getState().guests[0].paid).toBe(true)
  })

  it('does not auto-restore if guest has never paid', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    useStore.getState().incrementOrder(alice.id, espresso.id)
    useStore.getState().decrementOrder(alice.id, espresso.id)

    expect(useStore.getState().guests[0].paid).toBe(false)
  })
})

describe('Store - Undo', () => {
  beforeEach(resetStore)

  it('undoes markGuestPaid', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.setState({ cart: [] })
    useStore.getState().markGuestPaid(alice.id)

    expect(useStore.getState().guests[0].paid).toBe(true)
    expect(useStore.getState().payments).toHaveLength(1)

    useStore.getState().undo()

    expect(useStore.getState().guests[0].paid).toBe(false)
    expect(useStore.getState().payments).toHaveLength(0)
    expect(useStore.getState().orders).toHaveLength(1)
  })

  it('does nothing when no snapshot exists', () => {
    setupBasicEvent()
    const before = useStore.getState()
    useStore.getState().undo()
    const after = useStore.getState()
    expect(after.guests).toEqual(before.guests)
  })
})

describe('Store - Cart flow', () => {
  beforeEach(resetStore)

  it('adds items to cart and assigns to guest', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    useStore.getState().addToCart(espresso.id)
    useStore.getState().addToCart(espresso.id)
    expect(useStore.getState().cart).toHaveLength(1)
    expect(useStore.getState().cart[0].quantity).toBe(2)

    useStore.getState().assignCartToGuest(alice.id)
    expect(useStore.getState().cart).toHaveLength(0)
    expect(useStore.getState().orders).toHaveLength(1)
    expect(useStore.getState().orders[0].quantity).toBe(2)
  })

  it('decrements cart items', () => {
    const state = setupBasicEvent()
    const espresso = state.categories[0].drinks[0]

    useStore.getState().addToCart(espresso.id)
    useStore.getState().addToCart(espresso.id)
    useStore.getState().decrementCart(espresso.id)
    expect(useStore.getState().cart[0].quantity).toBe(1)

    useStore.getState().decrementCart(espresso.id)
    expect(useStore.getState().cart).toHaveLength(0)
  })

  it('getCartTotal returns correct total', () => {
    const state = setupBasicEvent()
    const espresso = state.categories[0].drinks[0] // 250
    const latte = state.categories[0].drinks[1] // 400

    useStore.getState().addToCart(espresso.id)
    useStore.getState().addToCart(latte.id)
    expect(useStore.getState().getCartTotal()).toBe(650)
  })
})

describe('Store - Derived helpers', () => {
  beforeEach(resetStore)

  it('getGuestTotal returns correct total', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0] // 250
    const redWine = state.categories[1].drinks[0] // 600

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.getState().addDrinkToGuest(alice.id, redWine.id)
    expect(useStore.getState().getGuestTotal(alice.id)).toBe(850)
  })

  it('getGuestLineItems returns correct items', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.getState().addDrinkToGuest(alice.id, espresso.id)

    const items = useStore.getState().getGuestLineItems(alice.id)
    expect(items).toHaveLength(1)
    expect(items[0].drinkName).toBe('Espresso')
    expect(items[0].quantity).toBe(2)
    expect(items[0].lineTotal).toBe(500)
  })

  it('getEventTotal excludes paid guests', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const bob = state.guests[1]
    const espresso = state.categories[0].drinks[0] // 250

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.getState().addDrinkToGuest(bob.id, espresso.id)
    useStore.setState({ cart: [] })

    expect(useStore.getState().getEventTotal()).toBe(500)

    useStore.getState().markGuestPaid(alice.id)
    expect(useStore.getState().getEventTotal()).toBe(250)
  })
})

describe('Store - Reset', () => {
  beforeEach(resetStore)

  it('resets guests, orders, payments but keeps categories', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.setState({ cart: [] })
    useStore.getState().markGuestPaid(alice.id)

    useStore.getState().resetEvent()
    const after = useStore.getState()
    expect(after.guests).toHaveLength(0)
    expect(after.orders).toHaveLength(0)
    expect(after.payments).toHaveLength(0)
    expect(after.categories).toHaveLength(2) // kept!
    expect(after.eventName).toBe('My Event')
  })
})

describe('Store - Menu import', () => {
  beforeEach(resetStore)

  it('replaces menu and cleans up orphaned orders', () => {
    const state = setupBasicEvent()
    const alice = state.guests[0]
    const espresso = state.categories[0].drinks[0]
    const redWine = state.categories[1].drinks[0]

    useStore.getState().addDrinkToGuest(alice.id, espresso.id)
    useStore.getState().addDrinkToGuest(alice.id, redWine.id)
    useStore.setState({ cart: [] })

    // Import a new menu with only coffee (no wine)
    const newCategories = [{
      id: 'new-cat',
      name: 'New Coffee',
      icon: 'coffee',
      sortOrder: 0,
      drinks: [{ id: espresso.id, name: 'Espresso', price: 300, categoryId: 'new-cat' }],
    }]

    useStore.getState().replaceMenu(newCategories)
    const after = useStore.getState()
    expect(after.categories).toHaveLength(1)
    expect(after.orders).toHaveLength(1) // espresso order kept (same id)
    expect(after.orders[0].drinkId).toBe(espresso.id)
  })
})
