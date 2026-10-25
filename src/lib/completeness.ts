export interface CompletenessInput {
  description?: string | null
  website_url?: string | null
  thumbnail_url?: string | null
  logo_url?: string | null
  category_id?: string | null
  features?: string[]
  technologies?: string[]
}

export interface CompletenessItem {
  key: string
  label: string
  ok: boolean
}

export interface Completeness {
  score: number
  done: number
  total: number
  items: CompletenessItem[]
  missing: string[]
}

const present = (v: string | null | undefined) => Boolean(v && v.trim())

/**
 * "Publish readiness": a guide to how finished a project's listing is, computed
 * from its real fields. It never blocks publishing.
 */
export function completeness(p: CompletenessInput): Completeness {
  const items: CompletenessItem[] = [
    { key: 'description', label: 'Full description (40+ characters)', ok: (p.description ?? '').trim().length >= 40 },
    { key: 'website_url', label: 'Website URL', ok: present(p.website_url) },
    { key: 'thumbnail_url', label: 'Thumbnail', ok: present(p.thumbnail_url) },
    { key: 'logo_url', label: 'Logo', ok: present(p.logo_url) },
    { key: 'category_id', label: 'Category', ok: present(p.category_id) },
    { key: 'features', label: 'At least one feature', ok: (p.features ?? []).some((f) => f.trim()) },
    { key: 'technologies', label: 'At least one technology', ok: (p.technologies ?? []).some((t) => t.trim()) },
  ]
  const done = items.filter((i) => i.ok).length
  return {
    score: Math.round((done / items.length) * 100),
    done,
    total: items.length,
    items,
    missing: items.filter((i) => !i.ok).map((i) => i.label),
  }
}
