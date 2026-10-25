import { describe, expect, it } from 'vitest'
import { applyProjectFilters, type FilterableQuery } from './projects'

type Call = [string, ...unknown[]]

/** Records every builder call so filters can be asserted without a database. */
function fakeQuery() {
  const calls: Call[] = []
  const q: FilterableQuery = {
    eq(column, value) {
      calls.push(['eq', column, value])
      return this
    },
    ilike(column, pattern) {
      calls.push(['ilike', column, pattern])
      return this
    },
    order(column, opts) {
      calls.push(['order', column, opts])
      return this
    },
    range(from, to) {
      calls.push(['range', from, to])
      return this
    },
  }
  return { q, calls }
}

describe('applyProjectFilters', () => {
  it('always restricts public queries to published projects', () => {
    const { q, calls } = fakeQuery()
    applyProjectFilters(q, { publication: 'draft' }, false)
    expect(calls).toContainEqual(['eq', 'publication_state', 'published'])
    expect(calls).not.toContainEqual(['eq', 'publication_state', 'draft'])
  })

  it('lets admin queries choose a publication state', () => {
    const { q, calls } = fakeQuery()
    applyProjectFilters(q, { publication: 'draft' }, true)
    expect(calls).toContainEqual(['eq', 'publication_state', 'draft'])
  })

  it('does not filter admin queries by default', () => {
    const { q, calls } = fakeQuery()
    applyProjectFilters(q, {}, true)
    expect(calls.some((c) => c[0] === 'eq' && c[1] === 'publication_state')).toBe(false)
  })

  it('matches every search word and escapes wildcards', () => {
    const { q, calls } = fakeQuery()
    applyProjectFilters(q, { search: 'QR 100%' }, false)
    const likes = calls.filter((c) => c[0] === 'ilike')
    expect(likes).toEqual([
      ['ilike', 'search_text', '%qr%'],
      ['ilike', 'search_text', '%100\\%%'],
    ])
  })

  it('applies category, status and featured filters', () => {
    const { q, calls } = fakeQuery()
    applyProjectFilters(q, { categorySlug: 'utilities', status: 'live', featuredOnly: true }, false)
    expect(calls).toContainEqual(['eq', 'category.slug', 'utilities'])
    expect(calls).toContainEqual(['eq', 'status', 'live'])
    expect(calls).toContainEqual(['eq', 'is_featured', true])
  })

  it('sorts by name A–Z', () => {
    const { q, calls } = fakeQuery()
    applyProjectFilters(q, { sort: 'name' }, false)
    expect(calls).toContainEqual(['order', 'name', { ascending: true }])
  })

  it('sorts newest by publication date descending', () => {
    const { q, calls } = fakeQuery()
    applyProjectFilters(q, { sort: 'newest' }, false)
    expect(calls).toContainEqual(['order', 'published_at', { ascending: false, nullsFirst: false }])
  })

  it('puts featured projects first by default', () => {
    const { q, calls } = fakeQuery()
    applyProjectFilters(q, {}, false)
    const orders = calls.filter((c) => c[0] === 'order')
    expect(orders[0]).toEqual(['order', 'is_featured', { ascending: false }])
  })

  it('paginates with a zero-based range', () => {
    const { q, calls } = fakeQuery()
    applyProjectFilters(q, { page: 3, pageSize: 12 }, false)
    expect(calls).toContainEqual(['range', 24, 35])
  })
})
