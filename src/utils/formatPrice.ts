export function formatPrice(cents: number): string {
  return '€' + (cents / 100).toFixed(2)
}

export function parsePriceInput(value: string): number {
  const num = parseFloat(value.replace(',', '.'))
  if (isNaN(num) || num < 0) return 0
  return Math.round(num * 100)
}
