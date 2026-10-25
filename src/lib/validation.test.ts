import { describe, expect, it } from 'vitest'
import {
  buildImagePath,
  cleanList,
  escapeLike,
  hasErrors,
  isSafeExternalUrl,
  isValidSlug,
  slugify,
  validateImageFile,
  validateProjectInput,
} from './validation'
import type { ProjectInput } from '../types'

const valid: ProjectInput = {
  name: 'QRGen',
  slug: 'qrgen',
  short_description: 'A QR code generator.',
  description: '',
  website_url: '',
  logo_url: '',
  thumbnail_url: '',
  category_id: '',
  status: 'development',
  publication_state: 'draft',
  is_featured: false,
  features: [],
  technologies: [],
  documentation_url: '',
  source_code_url: '',
  social_links: {},
  publish_at: '',
}

describe('slugify / slug validation', () => {
  it('creates url-safe slugs', () => {
    expect(slugify('QRGen')).toBe('qrgen')
    expect(slugify('  My Cool App!  ')).toBe('my-cool-app')
    expect(slugify('Café & Bar')).toBe('cafe-and-bar')
    expect(slugify('---')).toBe('')
  })

  it('validates slug format', () => {
    expect(isValidSlug('my-app-2')).toBe(true)
    expect(isValidSlug('My-App')).toBe(false)
    expect(isValidSlug('double--hyphen')).toBe(false)
    expect(isValidSlug('-leading')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })
})

describe('isSafeExternalUrl', () => {
  it('accepts http(s) URLs', () => {
    expect(isSafeExternalUrl('https://example.com')).toBe(true)
    expect(isSafeExternalUrl('http://example.com/path?x=1')).toBe(true)
  })

  it('rejects unsafe or malformed URLs', () => {
    for (const bad of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'ftp://example.com',
      '//example.com',
      '/relative',
      'example.com',
      ' https://example.com',
      'https://exa mple.com',
      '',
      null,
      undefined,
    ]) {
      expect(isSafeExternalUrl(bad as string | null | undefined)).toBe(false)
    }
  })
})

describe('escapeLike', () => {
  it('escapes LIKE wildcards', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\')
  })
})

describe('validateProjectInput', () => {
  it('accepts a minimal valid draft', () => {
    expect(hasErrors(validateProjectInput(valid))).toBe(false)
  })

  it('requires name, slug and short description', () => {
    const errors = validateProjectInput({ ...valid, name: ' ', slug: '', short_description: '' })
    expect(errors.name).toBeTruthy()
    expect(errors.slug).toBeTruthy()
    expect(errors.short_description).toBeTruthy()
  })

  it('rejects unsafe URLs in every link field', () => {
    const errors = validateProjectInput({
      ...valid,
      website_url: 'javascript:alert(1)',
      logo_url: 'data:image/png;base64,AAAA',
      thumbnail_url: 'ftp://x.y',
      documentation_url: 'nope',
      source_code_url: 'file:///x',
      social_links: { github: 'javascript:x' },
    })
    expect(errors.website_url).toBeTruthy()
    expect(errors.logo_url).toBeTruthy()
    expect(errors.thumbnail_url).toBeTruthy()
    expect(errors.documentation_url).toBeTruthy()
    expect(errors.source_code_url).toBeTruthy()
    expect(errors['social.github']).toBeTruthy()
  })

  it('rejects invalid slug characters', () => {
    expect(validateProjectInput({ ...valid, slug: 'Bad Slug' }).slug).toBeTruthy()
  })
})

describe('cleanList', () => {
  it('trims, de-duplicates case-insensitively and drops blanks', () => {
    expect(cleanList([' React ', 'react', '', 'Vite'])).toEqual(['React', 'Vite'])
  })
})

describe('image upload validation', () => {
  it('allows only the approved raster formats', () => {
    expect(validateImageFile({ type: 'image/png', size: 1000 })).toBeNull()
    expect(validateImageFile({ type: 'image/webp', size: 1000 })).toBeNull()
    expect(validateImageFile({ type: 'image/svg+xml', size: 1000 })).toBeTruthy()
    expect(validateImageFile({ type: 'text/html', size: 1000 })).toBeTruthy()
    expect(validateImageFile({ type: 'application/pdf', size: 1000 })).toBeTruthy()
  })

  it('enforces the size limit', () => {
    expect(validateImageFile({ type: 'image/png', size: 2 * 1024 * 1024 })).toBeNull()
    expect(validateImageFile({ type: 'image/png', size: 2 * 1024 * 1024 + 1 })).toBeTruthy()
    expect(validateImageFile({ type: 'image/png', size: 0 })).toBeTruthy()
  })

  it('never uses the original filename in the storage path', () => {
    const path = buildImagePath('logo', 'image/png', '1234-uuid')
    expect(path).toBe('logo/1234-uuid.png')
    expect(path).not.toMatch(/\.\.|\.php|\.html/)
  })
})
