import { describe, expect, it, vi } from 'vitest'

// Supabase must never be reached when the file is rejected client-side.
vi.mock('./supabase', () => ({
  getClient: () => {
    throw new Error('should not be called')
  },
  isSupabaseConfigured: true,
}))

import { uploadImage } from './upload'

describe('uploadImage', () => {
  it('rejects disallowed MIME types before any network call', async () => {
    const file = new File(['<svg onload=alert(1)>'], 'evil.svg', { type: 'image/svg+xml' })
    await expect(uploadImage(file, 'logo')).rejects.toMatchObject({ kind: 'validation' })
  })

  it('rejects oversized files before any network call', async () => {
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    await expect(uploadImage(big, 'thumbnail')).rejects.toMatchObject({ kind: 'validation' })
  })
})
