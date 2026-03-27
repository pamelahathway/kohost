import type { DrinkCategory } from '../types'
import { generateId } from './generateId'

interface MenuExportFormat {
  version: number
  exportedAt: string
  categories: Array<{
    name: string
    icon: string
    drinks: Array<{
      name: string
      price: number // integer cents
    }>
  }>
}

/**
 * Export the current menu as a downloadable JSON file.
 */
export function exportMenuJSON(categories: DrinkCategory[]): void {
  const data: MenuExportFormat = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: [...categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((cat) => ({
        name: cat.name,
        icon: cat.icon,
        drinks: cat.drinks.map((d) => ({
          name: d.name,
          price: d.price,
        })),
      })),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'kohost-menu.json'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Parse an imported menu JSON file and return DrinkCategory[] ready for the store.
 * Returns null if the file is invalid.
 */
export function importMenuJSON(text: string): DrinkCategory[] | null {
  try {
    const data = JSON.parse(text) as MenuExportFormat
    if (!Array.isArray(data.categories)) return null

    return data.categories.map((cat, i) => ({
      id: generateId(),
      name: String(cat.name ?? '').trim() || 'Unnamed',
      icon: String(cat.icon ?? 'Coffee'),
      sortOrder: i,
      drinks: Array.isArray(cat.drinks)
        ? cat.drinks.map((d) => ({
            id: generateId(),
            name: String(d.name ?? '').trim() || 'Unnamed',
            price: typeof d.price === 'number' && d.price >= 0 ? Math.round(d.price) : 0,
            categoryId: '', // will be linked by store
          }))
        : [],
    }))
  } catch {
    return null
  }
}
