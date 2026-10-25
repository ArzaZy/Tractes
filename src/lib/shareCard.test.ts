import { describe, expect, it } from 'vitest'
import { wrapLines } from './shareCard'

const measure = (s: string) => s.length * 10

describe('wrapLines', () => {
  it('wraps on word boundaries', () => {
    expect(wrapLines('one two three four', 100, measure, 5)).toEqual(['one two', 'three four'])
  })
  it('adds an ellipsis when truncated', () => {
    const out = wrapLines('aaa bbb ccc ddd eee fff', 70, measure, 2)
    expect(out).toHaveLength(2)
    expect(out[1]!.endsWith('…')).toBe(true)
  })
})
