import { describe, it, expect } from 'vitest'
import { formatPrice, parsePriceInput } from './formatPrice'

describe('formatPrice', () => {
  it('formats zero cents', () => {
    expect(formatPrice(0)).toBe('€0.00')
  })

  it('formats whole euros', () => {
    expect(formatPrice(500)).toBe('€5.00')
  })

  it('formats cents correctly', () => {
    expect(formatPrice(250)).toBe('€2.50')
    expect(formatPrice(199)).toBe('€1.99')
  })

  it('formats large amounts', () => {
    expect(formatPrice(10000)).toBe('€100.00')
  })
})

describe('parsePriceInput', () => {
  it('parses decimal input', () => {
    expect(parsePriceInput('2.50')).toBe(250)
  })

  it('parses comma-separated input', () => {
    expect(parsePriceInput('2,50')).toBe(250)
  })

  it('parses whole numbers', () => {
    expect(parsePriceInput('5')).toBe(500)
  })

  it('returns 0 for invalid input', () => {
    expect(parsePriceInput('abc')).toBe(0)
    expect(parsePriceInput('')).toBe(0)
  })

  it('returns 0 for negative numbers', () => {
    expect(parsePriceInput('-5')).toBe(0)
  })

  it('rounds to nearest cent', () => {
    expect(parsePriceInput('1.999')).toBe(200)
  })
})
