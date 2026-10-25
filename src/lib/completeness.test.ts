import { describe, expect, it } from 'vitest'
import { completeness } from './completeness'

describe('completeness', () => {
  it('scores an empty project at 0 and lists everything missing', () => {
    const c = completeness({})
    expect(c.score).toBe(0)
    expect(c.missing).toHaveLength(c.total)
  })

  it('scores a fully filled project at 100', () => {
    const c = completeness({
      description: 'A long enough description that explains what this project does.',
      website_url: 'https://example.com',
      thumbnail_url: 'https://example.com/t.png',
      logo_url: 'https://example.com/l.png',
      category_id: 'abc',
      features: ['Fast'],
      technologies: ['React'],
    })
    expect(c.score).toBe(100)
    expect(c.missing).toEqual([])
  })

  it('ignores blank strings and whitespace-only list items', () => {
    const c = completeness({ website_url: '   ', features: ['  '], technologies: [''], description: 'short' })
    expect(c.items.filter((i) => i.ok)).toHaveLength(0)
  })

  it('requires a meaningful description length', () => {
    expect(completeness({ description: 'x'.repeat(39) }).items[0]!.ok).toBe(false)
    expect(completeness({ description: 'x'.repeat(40) }).items[0]!.ok).toBe(true)
  })
})
