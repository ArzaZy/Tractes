import type { ProjectInput, SocialLinks } from '../types'
import { PROJECT_STATUSES, PUBLICATION_STATES } from '../types'
import { isFuture } from './schedule'

export const LIMITS = {
  name: 120,
  slug: 120,
  shortDescription: 300,
  description: 20000,
  listItems: 30,
  listItemLength: 120,
} as const

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Turns any text into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LIMITS.slug)
    .replace(/-+$/g, '')
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= LIMITS.slug && SLUG_RE.test(slug)
}

/**
 * Accepts only absolute http(s) URLs. Anything else (javascript:, data:, file:,
 * protocol-relative, relative paths) is rejected.
 */
export function isSafeExternalUrl(value: string | null | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (trimmed !== value || /\s/.test(trimmed)) return false
  try {
    const u = new URL(trimmed)
    return (u.protocol === 'https:' || u.protocol === 'http:') && Boolean(u.hostname)
  } catch {
    return false
  }
}

/** Returns the URL if it is safe to render as a link, otherwise null. */
export function safeUrlOrNull(value: string | null | undefined): string | null {
  return isSafeExternalUrl(value) ? (value as string) : null
}

export function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
}

/** Escapes characters that are special inside a Postgres LIKE/ILIKE pattern. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`)
}

export function cleanList(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const item = raw.trim().slice(0, LIMITS.listItemLength)
    const k = item.toLowerCase()
    if (item && !seen.has(k)) {
      seen.add(k)
      out.push(item)
    }
  }
  return out.slice(0, LIMITS.listItems)
}

export type FieldErrors = Partial<Record<string, string>>

const SOCIAL_KEYS: (keyof SocialLinks)[] = ['github', 'twitter', 'linkedin', 'instagram', 'youtube', 'website']

export function validateSocialLinks(links: SocialLinks, prefix = 'social'): FieldErrors {
  const errors: FieldErrors = {}
  for (const k of SOCIAL_KEYS) {
    const v = links[k]
    if (v && !isSafeExternalUrl(v)) errors[`${prefix}.${k}`] = 'Enter a valid http(s) URL.'
  }
  return errors
}

export function cleanSocialLinks(links: SocialLinks): SocialLinks {
  const out: SocialLinks = {}
  for (const k of SOCIAL_KEYS) {
    const v = links[k]?.trim()
    if (v) out[k] = v
  }
  return out
}

/** Client-side validation. The database enforces the same rules independently. */
export function validateProjectInput(input: ProjectInput): FieldErrors {
  const errors: FieldErrors = {}

  const name = input.name.trim()
  if (!name) errors.name = 'Name is required.'
  else if (name.length > LIMITS.name) errors.name = `Name must be ${LIMITS.name} characters or fewer.`

  if (!input.slug) errors.slug = 'Slug is required.'
  else if (!isValidSlug(input.slug)) errors.slug = 'Use lowercase letters, numbers and single hyphens only.'

  const short = input.short_description.trim()
  if (!short) errors.short_description = 'Short description is required.'
  else if (short.length > LIMITS.shortDescription) {
    errors.short_description = `Keep it under ${LIMITS.shortDescription} characters.`
  }

  if (input.description.length > LIMITS.description) {
    errors.description = `Description must be ${LIMITS.description} characters or fewer.`
  }

  const urlFields = ['website_url', 'logo_url', 'thumbnail_url', 'documentation_url', 'source_code_url'] as const
  for (const f of urlFields) {
    const v = input[f].trim()
    if (v && !isSafeExternalUrl(v)) errors[f] = 'Enter a valid http(s) URL (https is recommended).'
  }

  if (!PROJECT_STATUSES.includes(input.status)) errors.status = 'Choose a valid status.'
  if (!PUBLICATION_STATES.includes(input.publication_state)) errors.publication_state = 'Choose a valid state.'

  if (input.publish_at && input.publication_state === 'draft' && !isFuture(input.publish_at)) {
    errors.publish_at = 'Pick a time in the future.'
  }

  Object.assign(errors, validateSocialLinks(input.social_links))
  return errors
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean)
}

// ---------------------------------------------------------------------------
// Upload validation
// ---------------------------------------------------------------------------
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Only JPEG, PNG, WebP or AVIF images are allowed.'
  }
  if (file.size <= 0) return 'The file is empty.'
  if (file.size > MAX_IMAGE_BYTES) return 'Images must be 2 MB or smaller.'
  return null
}

/**
 * Builds a storage path from a random id and the *validated MIME type*; the
 * user's original filename is never used.
 */
export function buildImagePath(kind: 'logo' | 'thumbnail' | 'site', mime: string, id: string): string {
  const ext = EXT_BY_TYPE[mime] ?? 'bin'
  return `${kind}/${id}.${ext}`
}
