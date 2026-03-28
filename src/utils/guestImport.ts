/**
 * Parse an imported guest list file (JSON or CSV) and return an array of guest names.
 *
 * Supported formats:
 * - JSON: { "guests": ["Name 1", "Name 2"] } or just ["Name 1", "Name 2"]
 * - CSV:  one name per line (header row "name" is stripped if present)
 *
 * Returns null if the file is invalid or empty.
 */
export function parseGuestImport(text: string): string[] | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed)
      let names: unknown[]

      if (Array.isArray(data)) {
        names = data
      } else if (data && Array.isArray(data.guests)) {
        names = data.guests
      } else {
        return null
      }

      const result = names
        .map((n) => String(n ?? '').trim())
        .filter((n) => n.length > 0)
      return result.length > 0 ? result : null
    } catch {
      return null
    }
  }

  // Otherwise treat as CSV / plain text
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length === 0) return null

  // Detect multi-column CSV: if the first line contains commas, parse as CSV
  if (lines[0].includes(',')) {
    const header = lines[0].toLowerCase().split(',').map((h) => h.trim())
    // Find the "guest" or "name" column
    const guestCol = header.findIndex((h) => h === 'guest' || h === 'name')
    if (guestCol >= 0) {
      // Extract names from that column, skipping the header
      const names = lines.slice(1)
        .map((line) => {
          const cols = line.split(',')
          return cols[guestCol]?.trim() ?? ''
        })
        .filter((n) => n.length > 0)
      return names.length > 0 ? names : null
    }
    // No recognized header — treat first column as names, skip header if it looks like one
    const names = lines.slice(1)
      .map((line) => line.split(',')[0]?.trim() ?? '')
      .filter((n) => n.length > 0)
    return names.length > 0 ? names : null
  }

  // Plain text — one name per line
  // Strip header row if it looks like one
  if (/^name$/i.test(lines[0])) {
    lines.shift()
  }

  return lines.length > 0 ? lines : null
}
