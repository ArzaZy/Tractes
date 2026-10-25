import { describe, expect, it } from 'vitest'
import { aggregateViews, shouldRecordView } from './views'

const today = new Date('2026-10-25T10:00:00Z')
const projects = [
  { id: 'a', name: 'Alpha', slug: 'alpha' },
  { id: 'b', name: 'Beta', slug: 'beta' },
]

describe('aggregateViews', () => {
  it('sums, zero-fills and ranks', () => {
    const s = aggregateViews(
      [
        { project_id: 'a', day: '2026-10-25', views: 3 },
        { project_id: 'a', day: '2026-10-24', views: 2 },
        { project_id: 'b', day: '2026-10-25', views: 9 },
        { project_id: 'b', day: '2026-08-01', views: 100 }, // outside the 30-day window
      ],
      projects,
      today,
    )
    expect(s.total).toBe(14)
    expect(s.today).toBe(12)
    expect(s.daily).toHaveLength(14)
    expect(s.daily.at(-1)).toEqual({ day: '2026-10-25', views: 12 })
    expect(s.daily.at(-3)?.views).toBe(0)
    expect(s.top.map((t) => t.slug)).toEqual(['beta', 'alpha'])
  })
})

describe('shouldRecordView', () => {
  it('counts once per session', () => {
    const data = new Map<string, string>()
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
    expect(shouldRecordView('alpha', storage)).toBe(true)
    expect(shouldRecordView('alpha', storage)).toBe(false)
    expect(shouldRecordView('beta', storage)).toBe(true)
  })
})
