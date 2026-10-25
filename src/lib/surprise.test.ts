import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ getClient: vi.fn(), isSupabaseConfigured: true }))

import { pickOffset } from './projects'

describe('pickOffset', () => {
  it('stays inside [0, total)', () => {
    expect(pickOffset(5, () => 0)).toBe(0)
    expect(pickOffset(5, () => 0.999999)).toBe(4)
    expect(pickOffset(5, () => 1)).toBe(4)
    expect(pickOffset(1, () => 0.7)).toBe(0)
  })

  it('returns 0 when there is nothing to pick from', () => {
    expect(pickOffset(0)).toBe(0)
  })
})
