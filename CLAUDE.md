# KoHost - Pop-Up Kitchen Drink Tab Tracker

## What is this?

KoHost is a lightweight, offline-capable iPad web app for running a drinks tab at a pop-up event. Food is included in the ticket price; drinks are ordered throughout the day and guests settle up before they leave. A single operator (the host) uses the app behind the bar to record drink orders and mark guests as paid.

**Use case:** Single-event, 20-50 guests, no backend needed.

## How to run

```bash
npm install
npm run dev          # starts on http://localhost:5173
npm run build        # production build to dist/
npm run preview      # preview production build
```

Node runs via nvm. Dev server: Vite on port 5173.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Build | Vite 8 |
| UI | React 19, TypeScript 5.9 |
| Styling | Tailwind CSS v4 (CSS-first, no config file) |
| State | Zustand 5 with localStorage persistence |
| Icons | lucide-react |
| CSV | papaparse |
| PWA | vite-plugin-pwa + workbox |

## Architecture

```
src/
  types.ts                    # All TypeScript interfaces
  store.ts                    # Single Zustand store (state + actions)
  App.tsx                     # Tab routing (order | guests | dashboard | setup)
  main.tsx                    # React entry point

  components/
    layout/
      TopBar.tsx              # Tab navigation bar
    order/
      OverviewScreen.tsx      # Main ordering screen wrapper
      DrinkGrid.tsx           # Guest x Category grid with icons
      DrinkCategoryModal.tsx  # Drink picker for a guest+category cell
      CurrentOrderStrip.tsx   # Active cart display
      GuestPicker.tsx         # Modal to select/assign guest
      GuestSummaryModal.tsx   # Quick guest tab summary from grid
      OrderScreen.tsx         # Legacy order screen (split panel)
    guests/
      GuestOverview.tsx       # Guest list with payment status sections
      TabDetail.tsx           # Individual guest tab detail + editing
    dashboard/
      EventDashboard.tsx      # Revenue, drinks served, bar charts
    setup/
      SetupScreen.tsx         # Event config, import/export, reset
      MenuEditor.tsx          # Category + drink management
      GuestEditor.tsx         # Guest list management
      IconPicker.tsx          # Lucide icon selector for categories
    shared/
      Button.tsx              # Reusable styled button
      Modal.tsx               # Generic modal wrapper
      ConfirmDialog.tsx       # Confirmation dialog
      UndoToast.tsx           # Auto-dismissing undo toast

  utils/
    formatPrice.ts            # formatPrice(cents) -> "€1.50", parsePriceInput
    generateId.ts             # crypto.randomUUID() wrapper
    csvExport.ts              # Guest CSV, all-orders CSV, guest-list CSV
    menuExport.ts             # Menu JSON export/import
    guestImport.ts            # Guest import (JSON or CSV/text)
```

## Data model (src/types.ts)

All prices are stored as **integer cents** to avoid floating-point issues. Displayed in EUR.

- **DrinkCategory** — `id, name, icon (lucide name), sortOrder, drinks[]`
- **Drink** — `id, name, price (cents), categoryId`
- **Guest** — `id, name, sortOrder, paid (boolean), paidAt`
- **OrderItem** — `guestId, drinkId, quantity, createdAt (timestamp)`
- **CartItem** — `guestId, drinkId, drinkName, categoryName, unitPrice, quantity`
- **PaymentRecord** — `id, guestId, guestName, items (PaidLineItem[]), total, paidAt`
- **PaidLineItem** — `drinkName, categoryName, quantity, unitPrice, lineTotal`
- **AppTab** — `'order' | 'guests' | 'dashboard' | 'setup'`

## Store (src/store.ts)

Single Zustand store persisted to localStorage key `kohost-tab-tracker`.

**What is persisted:** eventName, categories, guests, orders, payments, setupComplete.
**What is NOT persisted:** cart (transient), undo snapshot, navigateToGuestId, lastActiveGuestId.

### Key actions

- **Cart flow:** `addToCart` -> `assignCartToGuest` -> `clearCart`
- **Direct ordering:** `addDrinkToGuest`, `removeDrinkFromGuest`, `incrementOrder`, `decrementOrder`
- **Payment:** `markGuestPaid` (snapshots orders into PaymentRecord) -> `reopenGuestTab`
- **Undo:** `_snapshot(label)` saves state before destructive actions; `undo()` restores it. Covers finish order, mark as paid.
- **Menu management:** CRUD for categories and drinks, `replaceMenu` for JSON import
- **Guest management:** CRUD, `reorderGuests`
- **Reset:** `resetEvent` wipes guests, orders, payments (keeps menu)

### Auto-restore paid status

When drinks are removed from a reopened guest and their order total returns to zero, the store automatically re-marks them as paid (preserving payment history).

## Screens

### Overview (main working screen)
A grid with guests as rows, drink categories as columns. Tap a cell to open the DrinkCategoryModal for that guest+category. Icons in cells show category with a count badge. A "Done" button appears in the row of the last active guest to finish the current order.

**CurrentOrderStrip** at the top shows the active cart items grouped by guest, with a running total.

### Guests
Three sections: Outstanding, No Payment Needed, Paid. Tapping a guest opens TabDetail with line items, edit capability, payment history, print receipt, and Mark as Paid. Bulk Pay button on Outstanding section lets you select multiple guests.

### Dashboard
Top tiles: Drinks Served, Total Revenue (with guest count), Paid, Outstanding. Two bar charts: Drink Breakdown (all menu items, toggle to hide zeros) and Spend by Guest (sorted highest to lowest).

### Setup
Compact header with event name (tap to rename), Import/Export dropdown buttons, and Reset. Below: two-column editor for drink categories and guest list, scrolling together.

## Key patterns

1. **Cents-based pricing** — all math in integers, `formatPrice(cents)` for display
2. **Transient cart** — not persisted, represents current in-progress order only
3. **Payment snapshots** — `markGuestPaid` captures drink names so history survives menu edits
4. **Cross-tab navigation** — `navigateToGuestId` in store lets Overview link to a guest's TabDetail
5. **Undo system** — single snapshot before destructive actions (finish order, mark paid), auto-dismiss toast after 5 seconds
6. **Haptic feedback** — `navigator.vibrate(10)` on drink add in the category modal
7. **Print receipt** — opens a new window with clean printable receipt, auto-triggers `window.print()`

## Import/Export formats

**Menu JSON:**
```json
{
  "version": 1,
  "exportedAt": "2026-03-27T...",
  "categories": [
    { "name": "Coffee", "icon": "coffee", "drinks": [
      { "name": "Espresso", "price": 250 }
    ]}
  ]
}
```

**Guest import:** JSON array `["Name1", "Name2"]` or CSV/text (one name per line).

**CSV exports:** Orders & Payments (one row per drink line with guest, category, drink, qty, price, status, timestamp), Guest List (one row per guest with outstanding and paid totals).

## PWA

Configured via `vite-plugin-pwa` in `vite.config.ts`:
- Auto-update service worker
- Standalone display, landscape orientation
- Caches all JS/CSS/HTML/images for offline use
- Theme color: `#1a1a2e`

## Styling notes

- Tailwind v4 (CSS-first, imported via `@import "tailwindcss"` in index.css)
- Light theme, green accent (`green-700` for WCAG AA contrast)
- Touch optimized: `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`
- Min 44px touch targets for interactive elements
