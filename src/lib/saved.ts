/**
 * "Saved" projects live only in this browser (localStorage). No account, no server.
 * Pure helpers; the React state lives in hooks/useSaved.tsx.
 */
export const SAVED_KEY = 'traclabs-saved'
export const MAX_SAVED = 100
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function parseSaved(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]')
    if (!Array.isArray(value)) return []
    const out: string[] = []
    for (const item of value) {
      if (typeof item === 'string' && item.length <= 120 && SLUG.test(item) && !out.includes(item)) out.push(item)
    }
    return out.slice(0, MAX_SAVED)
  } catch {
    return []
  }
}

/** Adds or removes `slug`. Newly saved items go first. */
export function toggleSaved(list: string[], slug: string): string[] {
  return list.includes(slug) ? list.filter((s) => s !== slug) : [slug, ...list].slice(0, MAX_SAVED)
}
