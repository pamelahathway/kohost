# KoHost

A lightweight, offline-capable iPad web app for running a drinks tab at a pop-up event. Food is included in the ticket price; drinks are ordered throughout the day and guests settle up before they leave.

Built for a single operator (the host) behind the bar to record drink orders and mark guests as paid. Designed for single-event use with 20-50 guests, no backend needed.

## Getting Started

```bash
npm install
npm run dev          # starts on http://localhost:5173
npm run build        # production build to dist/
npm run preview      # preview production build
```

## Screens

- **Overview** — Main working screen. A grid with guests as rows and drink categories as columns. Tap a cell to add drinks. A running total strip shows the active order.
- **Guests** — Guest list split into Outstanding, No Payment Needed, and Paid sections. Tap a guest to see their tab, edit orders, view payment history, or print a receipt.
- **Dashboard** — Revenue tiles, drink breakdown bar chart, and spend-by-guest chart.
- **Setup** — Event name, menu editor (categories + drinks), guest list editor, import/export (JSON menus, CSV data), and event reset.

## Tech Stack

| Layer   | Technology                              |
| ------- | --------------------------------------- |
| Build   | Vite 8                                  |
| UI      | React 19, TypeScript 5.9               |
| Styling | Tailwind CSS v4 (CSS-first)            |
| State   | Zustand 5 with localStorage persistence |
| Icons   | lucide-react                            |
| CSV     | papaparse                               |
| PWA     | vite-plugin-pwa + workbox               |

## Key Design Decisions

- **Cents-based pricing** — All prices stored as integer cents to avoid floating-point issues. Displayed in EUR.
- **Offline-first PWA** — Service worker caches all assets. Works without network after first load.
- **Payment snapshots** — When a guest is marked as paid, drink names are captured so payment history survives menu edits.
- **Transient cart** — The in-progress order is not persisted to localStorage (intentional — it represents the current interaction only).
- **Single-store architecture** — All state lives in one Zustand store persisted to `localStorage`.

## Import/Export

- **Menu**: JSON format with categories and drinks (prices in cents)
- **Guest list**: JSON array of names, or plain text (one name per line)
- **CSV exports**: Orders & Payments (per-drink-line detail), Guest List (per-guest summary with totals)

## License

MIT
