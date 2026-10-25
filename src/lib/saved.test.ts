import { describe, expect, it } from 'vitest'
import { MAX_SAVED, parseSaved, toggleSaved } from './saved'

describe('saved list', () => {
  it('parses safely', () => {
    expect(parseSaved(null)).toEqual([])
    expect(parseSaved('not json')).toEqual([])
    expect(parseSaved('{"a":1}')).toEqual([])
    expect(parseSaved('["qr-gen","Bad Slug",5,"qr-gen","<script>"]')).toEqual(['qr-gen'])
  })
  it('toggles, newest first, and caps the list', () => {
    expect(toggleSaved(['a'], 'b')).toEqual(['b', 'a'])
    expect(toggleSaved(['b', 'a'], 'b')).toEqual(['a'])
    const many = Array.from({ length: MAX_SAVED }, (_, i) => `p-${i}`)
    expect(toggleSaved(many, 'new')).toHaveLength(MAX_SAVED)
    expect(toggleSaved(many, 'new')[0]).toBe('new')
  })
})
