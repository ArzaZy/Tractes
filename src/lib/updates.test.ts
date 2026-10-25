import { describe, expect, it } from 'vitest'
import { normaliseVersion, validateUpdate } from './updates'

describe('project updates', () => {
  it('strips a leading v', () => {
    expect(normaliseVersion(' v1.2 ')).toBe('1.2')
    expect(normaliseVersion('beta')).toBe('beta')
  })
  it('requires a note and limits length', () => {
    expect(validateUpdate({ version: '1.0', note: '' }).note).toBeTruthy()
    expect(validateUpdate({ version: '1.0', note: 'x'.repeat(501) }).note).toBeTruthy()
    expect(validateUpdate({ version: '', note: 'Fixed login' })).toEqual({})
  })
  it('rejects odd versions', () => {
    expect(validateUpdate({ version: '1 2 <b>', note: 'ok' }).version).toBeTruthy()
  })
})
