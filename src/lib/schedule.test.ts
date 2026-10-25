import { describe, expect, it } from 'vitest'
import { fromLocalInput, isFuture, toLocalInput } from './schedule'

describe('schedule helpers', () => {
  it('round-trips a local datetime', () => {
    const iso = fromLocalInput('2026-12-01T09:30')
    expect(iso).toMatch(/Z$/)
    expect(toLocalInput(iso)).toBe('2026-12-01T09:30')
  })
  it('handles empty and invalid input', () => {
    expect(fromLocalInput('')).toBeNull()
    expect(fromLocalInput('nope')).toBeNull()
    expect(toLocalInput(null)).toBe('')
  })
  it('detects future times', () => {
    const now = Date.parse('2026-10-25T00:00:00Z')
    expect(isFuture('2030-01-01T00:00', now)).toBe(true)
    expect(isFuture('2020-01-01T00:00', now)).toBe(false)
  })
})
