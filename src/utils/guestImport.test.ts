import { describe, it, expect } from 'vitest'
import { parseGuestImport } from './guestImport'

describe('parseGuestImport', () => {
  it('parses JSON array', () => {
    expect(parseGuestImport('["Alice", "Bob"]')).toEqual(['Alice', 'Bob'])
  })

  it('parses JSON object with guests key', () => {
    expect(parseGuestImport('{"guests": ["Alice", "Bob"]}')).toEqual(['Alice', 'Bob'])
  })

  it('parses plain text (one name per line)', () => {
    expect(parseGuestImport('Alice\nBob\nCharlie')).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('strips "name" header from plain text', () => {
    expect(parseGuestImport('name\nAlice\nBob')).toEqual(['Alice', 'Bob'])
  })

  it('parses multi-column CSV with Guest header', () => {
    const csv = `Guest,Status,Outstanding,Total Paid,Total Consumed
Hanno,outstanding,€4.50,€25.50,€30.00
Jannik,outstanding,€12.50,€26.00,€38.50
Karla,outstanding,€35.00,€0.00,€35.00`
    expect(parseGuestImport(csv)).toEqual(['Hanno', 'Jannik', 'Karla'])
  })

  it('parses multi-column CSV with Name header', () => {
    const csv = `Name,Email,Phone
Alice,alice@example.com,555-1234
Bob,bob@example.com,555-5678`
    expect(parseGuestImport(csv)).toEqual(['Alice', 'Bob'])
  })

  it('parses multi-column CSV without recognized header (uses first column)', () => {
    const csv = `Attendee,Table
Alice,1
Bob,2`
    expect(parseGuestImport(csv)).toEqual(['Alice', 'Bob'])
  })

  it('returns null for empty input', () => {
    expect(parseGuestImport('')).toBeNull()
    expect(parseGuestImport('   ')).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(parseGuestImport('{invalid')).toBeNull()
  })

  it('handles CSV with extra whitespace', () => {
    const csv = `Guest , Status
 Alice , paid
 Bob , outstanding `
    expect(parseGuestImport(csv)).toEqual(['Alice', 'Bob'])
  })
})
