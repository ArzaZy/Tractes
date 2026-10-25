import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPLORE, buildExploreParams, hasActiveFilters, parseExploreParams, totalPages } from './exploreParams'

describe('explore URL state', () => {
  it('round-trips filters through the URL', () => {
    const state = { q: 'qr code', category: 'utilities', tech: 'React', status: 'live' as const, sort: 'name' as const, page: 3 }
    const url = buildExploreParams(state)
    expect(parseExploreParams(new URLSearchParams(url.toString()))).toEqual(state)
  })

  it('omits defaults to keep URLs clean', () => {
    expect(buildExploreParams(DEFAULT_EXPLORE).toString()).toBe('')
  })

  it('ignores invalid values', () => {
    const parsed = parseExploreParams(new URLSearchParams('status=hacked&sort=drop&page=-4&category=Bad Slug!'))
    expect(parsed.status).toBe('')
    expect(parsed.sort).toBe('featured')
    expect(parsed.page).toBe(1)
    expect(parsed.category).toBe('')
  })

  it('detects active filters', () => {
    expect(hasActiveFilters(DEFAULT_EXPLORE)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_EXPLORE, q: 'x' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_EXPLORE, sort: 'newest' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_EXPLORE, tech: 'React' })).toBe(true)
  })

  it('computes page counts', () => {
    expect(totalPages(0)).toBe(1)
    expect(totalPages(12)).toBe(1)
    expect(totalPages(13)).toBe(2)
  })
})
