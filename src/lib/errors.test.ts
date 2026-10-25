import { describe, expect, it } from 'vitest'
import { AppError, toAppError, withTimeout } from './errors'

describe('toAppError', () => {
  it('maps duplicate keys to a friendly duplicate error', () => {
    const e = toAppError({ code: '23505', message: 'duplicate key value violates unique constraint "projects_slug_key"' })
    expect(e.kind).toBe('duplicate')
    expect(e.message).not.toMatch(/projects_slug_key/)
  })

  it('maps RLS denials to permission errors', () => {
    expect(toAppError({ code: '42501', message: 'new row violates row-level security policy' }).kind).toBe('permission')
  })

  it('maps expired JWTs to auth errors', () => {
    expect(toAppError({ message: 'JWT expired' }).kind).toBe('auth')
  })

  it('maps fetch failures to network errors', () => {
    expect(toAppError(new TypeError('Failed to fetch')).kind).toBe('network')
  })

  it('never leaks raw internal messages', () => {
    const e = toAppError({ message: 'relation "secret_table" does not exist' })
    expect(e.kind).toBe('unknown')
    expect(e.message).not.toMatch(/secret_table/)
  })
})

describe('withTimeout', () => {
  it('rejects slow requests with a timeout error', async () => {
    const never = new Promise<never>(() => undefined)
    await expect(withTimeout(never, 10)).rejects.toMatchObject({ kind: 'timeout' })
  })

  it('passes through successful results', async () => {
    await expect(withTimeout(Promise.resolve(5), 100)).resolves.toBe(5)
  })

  it('passes through errors', async () => {
    await expect(withTimeout(Promise.reject(new AppError('auth', 'x')), 100)).rejects.toMatchObject({ kind: 'auth' })
  })
})
