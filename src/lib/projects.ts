import type {
  TechCount,
  PagedResult,
  ProjectInput,
  ProjectStatus,
  ProjectWithCategory,
  PublicationState,
  SortOption,
} from '../types'
import { AppError, toAppError, withTimeout } from './errors'
import { getClient } from './supabase'
import { cleanList, cleanSocialLinks, escapeLike } from './validation'
import { fromLocalInput } from './schedule'

const SELECT = '*, category:categories(id,name,slug,icon)'
const SELECT_INNER = '*, category:categories!inner(id,name,slug,icon)'

export interface ProjectFilters {
  search?: string
  categorySlug?: string
  status?: ProjectStatus | ''
  featuredOnly?: boolean
  /** Technology name, matched case-insensitively against the project's tech_keys. */
  tech?: string
  sort?: SortOption
  page?: number
  pageSize?: number
  /** Admin only: restrict to a publication state. Public queries ignore this. */
  publication?: PublicationState | ''
}

/** Minimal chainable surface of the Supabase query builder that we rely on. */
export interface FilterableQuery {
  eq(column: string, value: string | boolean): this
  ilike(column: string, pattern: string): this
  contains(column: string, value: string[]): this
  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this
  range(from: number, to: number): this
}

/**
 * Applies search, filters, sort and pagination. Kept free of Supabase imports so
 * it can be unit-tested with a fake builder.
 */
export function applyProjectFilters<Q extends FilterableQuery>(query: Q, f: ProjectFilters, admin: boolean): Q {
  let q = query

  if (!admin) q = q.eq('publication_state', 'published')
  else if (f.publication) q = q.eq('publication_state', f.publication)

  const term = f.search?.trim().slice(0, 100)
  if (term) {
    // Each whitespace-separated word must match (AND), case-insensitively.
    for (const word of term.toLowerCase().split(/\s+/).filter(Boolean)) {
      q = q.ilike('search_text', `%${escapeLike(word)}%`)
    }
  }

  if (f.categorySlug) q = q.eq('category.slug', f.categorySlug)
  if (f.status) q = q.eq('status', f.status)
  if (f.featuredOnly) q = q.eq('is_featured', true)
  if (f.tech?.trim()) q = q.contains('tech_keys', [f.tech.trim().toLowerCase()])

  switch (f.sort ?? 'featured') {
    case 'newest':
      q = q.order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
      break
    case 'name':
      q = q.order('name', { ascending: true })
      break
    default:
      q = q
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
  }

  const pageSize = f.pageSize ?? 12
  const page = Math.max(1, f.page ?? 1)
  return q.range((page - 1) * pageSize, page * pageSize - 1)
}

function normalise(row: Record<string, unknown>): ProjectWithCategory {
  const r = row as unknown as ProjectWithCategory
  return {
    ...r,
    features: Array.isArray(r.features) ? r.features : [],
    technologies: Array.isArray(r.technologies) ? r.technologies : [],
    social_links: r.social_links && typeof r.social_links === 'object' ? r.social_links : {},
    category: r.category ?? null,
  }
}

async function list(f: ProjectFilters, admin: boolean): Promise<PagedResult<ProjectWithCategory>> {
  try {
    const base = getClient()
      .from('projects')
      .select(f.categorySlug ? SELECT_INNER : SELECT, { count: 'exact' })
    const { data, error, count } = await withTimeout(
      applyProjectFilters(base as unknown as FilterableQuery & PromiseLike<never>, f, admin) as unknown as PromiseLike<{
        data: Record<string, unknown>[] | null
        error: unknown
        count: number | null
      }>,
    )
    if (error) throw error
    return { items: (data ?? []).map(normalise), total: count ?? 0 }
  } catch (e) {
    throw toAppError(e)
  }
}

export const listPublicProjects = (f: ProjectFilters) => list(f, false)
export const listAdminProjects = (f: ProjectFilters) => list(f, true)

export async function getPublicProject(slug: string): Promise<ProjectWithCategory | null> {
  try {
    const { data, error } = await withTimeout(
      getClient()
        .from('projects')
        .select(SELECT)
        .eq('slug', slug)
        .eq('publication_state', 'published')
        .maybeSingle(),
    )
    if (error) throw error
    return data ? normalise(data as Record<string, unknown>) : null
  } catch (e) {
    throw toAppError(e)
  }
}

export async function getRelatedProjects(project: ProjectWithCategory, limit = 3): Promise<ProjectWithCategory[]> {
  try {
    let q = getClient()
      .from('projects')
      .select(SELECT)
      .eq('publication_state', 'published')
      .neq('id', project.id)
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit)
    if (project.category_id) q = q.eq('category_id', project.category_id)
    const { data, error } = await withTimeout(q)
    if (error) throw error
    return (data ?? []).map((r) => normalise(r as Record<string, unknown>))
  } catch (e) {
    throw toAppError(e)
  }
}

export async function getProjectById(id: string): Promise<ProjectWithCategory | null> {
  try {
    const { data, error } = await withTimeout(getClient().from('projects').select(SELECT).eq('id', id).maybeSingle())
    if (error) throw error
    return data ? normalise(data as Record<string, unknown>) : null
  } catch (e) {
    throw toAppError(e)
  }
}

/** Quick search for the overlay: published projects only. */
export async function searchPublicProjects(term: string, limit = 8): Promise<ProjectWithCategory[]> {
  const { items } = await listPublicProjects({ search: term, pageSize: limit, sort: 'featured' })
  return items
}

export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  try {
    let q = getClient().from('projects').select('id', { head: true, count: 'exact' }).eq('slug', slug)
    if (excludeId) q = q.neq('id', excludeId)
    const { count, error } = await withTimeout(q)
    if (error) throw error
    return (count ?? 0) > 0
  } catch (e) {
    throw toAppError(e)
  }
}

function toRow(input: ProjectInput) {
  const nullable = (v: string) => (v.trim() ? v.trim() : null)
  return {
    name: input.name.trim(),
    slug: input.slug,
    short_description: input.short_description.trim(),
    description: nullable(input.description),
    website_url: nullable(input.website_url),
    logo_url: nullable(input.logo_url),
    thumbnail_url: nullable(input.thumbnail_url),
    category_id: input.category_id || null,
    status: input.status,
    publication_state: input.publication_state,
    is_featured: input.is_featured,
    features: cleanList(input.features),
    technologies: cleanList(input.technologies),
    documentation_url: nullable(input.documentation_url),
    source_code_url: nullable(input.source_code_url),
    social_links: cleanSocialLinks(input.social_links),
    // Only drafts can be scheduled; the database also clears it on publish.
    publish_at: input.publication_state === 'draft' ? fromLocalInput(input.publish_at) : null,
  }
}

/** Resolves only after the database confirmed the write. */
export async function createProject(input: ProjectInput): Promise<ProjectWithCategory> {
  try {
    const { data, error } = await withTimeout(getClient().from('projects').insert(toRow(input)).select(SELECT).single())
    if (error) throw error
    return normalise(data as Record<string, unknown>)
  } catch (e) {
    throw toAppError(e)
  }
}

export async function updateProject(id: string, input: ProjectInput): Promise<ProjectWithCategory> {
  try {
    const { data, error } = await withTimeout(
      getClient().from('projects').update(toRow(input)).eq('id', id).select(SELECT).maybeSingle(),
    )
    if (error) throw error
    // RLS silently filters rows the caller may not update; zero rows means denied or missing.
    if (!data) throw new AppError('permission', 'The project could not be updated. It may not exist, or you may not have permission.')
    return normalise(data as Record<string, unknown>)
  } catch (e) {
    throw toAppError(e)
  }
}

export async function patchProject(
  id: string,
  patch: Partial<{ is_featured: boolean; publication_state: PublicationState; status: ProjectStatus }>,
): Promise<void> {
  try {
    const { data, error } = await withTimeout(getClient().from('projects').update(patch).eq('id', id).select('id'))
    if (error) throw error
    if (!data || data.length === 0) throw new AppError('permission', 'The change was not saved. You may not have permission.')
  } catch (e) {
    throw toAppError(e)
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const { data, error } = await withTimeout(getClient().from('projects').delete().eq('id', id).select('id'))
    if (error) throw error
    if (!data || data.length === 0) throw new AppError('permission', 'The project was not deleted. You may not have permission.')
  } catch (e) {
    throw toAppError(e)
  }
}

export interface DashboardStats {
  total: number
  published: number
  draft: number
  featured: number
  byStatus: Record<ProjectStatus, number>
  recent: ProjectWithCategory[]
  drafts: ProjectWithCategory[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const client = getClient()
    const count = async (build: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
      const { count: c, error } = await withTimeout(build(base()))
      if (error) throw error
      return c ?? 0
    }
    const base = () => client.from('projects').select('id', { head: true, count: 'exact' })

    const [total, published, featured, dev, beta, live, archived, recent, drafts] = await Promise.all([
      count((q) => q),
      count((q) => q.eq('publication_state', 'published')),
      count((q) => q.eq('is_featured', true)),
      count((q) => q.eq('status', 'development')),
      count((q) => q.eq('status', 'beta')),
      count((q) => q.eq('status', 'live')),
      count((q) => q.eq('status', 'archived')),
      withTimeout(client.from('projects').select(SELECT).order('updated_at', { ascending: false }).limit(5)),
      withTimeout(
        client.from('projects').select(SELECT).eq('publication_state', 'draft').order('updated_at', { ascending: false }).limit(20),
      ),
    ])
    if (recent.error) throw recent.error
    if (drafts.error) throw drafts.error

    return {
      total,
      published,
      draft: total - published,
      featured,
      byStatus: { development: dev, beta, live, archived },
      recent: (recent.data ?? []).map((r) => normalise(r as Record<string, unknown>)),
      drafts: (drafts.data ?? []).map((r) => normalise(r as Record<string, unknown>)),
    }
  } catch (e) {
    throw toAppError(e)
  }
}

/**
 * Loads a project by slug regardless of publication state. Row Level Security
 * still applies: anonymous visitors get nothing back for drafts, only admins do.
 */
export async function getProjectBySlug(slug: string): Promise<ProjectWithCategory | null> {
  try {
    const { data, error } = await withTimeout(getClient().from('projects').select(SELECT).eq('slug', slug).maybeSingle())
    if (error) throw error
    return data ? normalise(data as Record<string, unknown>) : null
  } catch (e) {
    throw toAppError(e)
  }
}

/** Uniform random offset in [0, total). `rand` is injectable for tests. */
export function pickOffset(total: number, rand: () => number = Math.random): number {
  if (total <= 0) return 0
  return Math.min(total - 1, Math.floor(rand() * total))
}

/** Slug of a random published project, or null when nothing is published. */
export async function getRandomPublishedSlug(): Promise<string | null> {
  try {
    const client = getClient()
    const head = await withTimeout(
      client.from('projects').select('id', { head: true, count: 'exact' }).eq('publication_state', 'published'),
    )
    if (head.error) throw head.error
    const total = head.count ?? 0
    if (total === 0) return null
    const offset = pickOffset(total)
    const { data, error } = await withTimeout(
      client
        .from('projects')
        .select('slug')
        .eq('publication_state', 'published')
        .order('created_at', { ascending: true })
        .range(offset, offset),
    )
    if (error) throw error
    return (data?.[0]?.slug as string | undefined) ?? null
  } catch (e) {
    throw toAppError(e)
  }
}

/** Saved-list lookup: published projects only, in the order the visitor saved them. */
export async function listProjectsBySlugs(slugs: string[]): Promise<ProjectWithCategory[]> {
  if (slugs.length === 0) return []
  try {
    const { data, error } = await withTimeout(
      getClient().from('projects').select(SELECT).in('slug', slugs.slice(0, 100)).eq('publication_state', 'published'),
    )
    if (error) throw error
    const order = new Map(slugs.map((s, i) => [s, i]))
    return (data ?? [])
      .map((r) => normalise(r as Record<string, unknown>))
      .sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0))
  } catch (e) {
    throw toAppError(e)
  }
}

/**
 * Counts how many projects use each technology, merging different capitalisations
 * ("react" / "React") and showing the most common spelling.
 */
export function aggregateTechnologies(lists: string[][]): TechCount[] {
  const counts = new Map<string, number>()
  const spellings = new Map<string, Map<string, number>>()
  for (const list of lists) {
    const seen = new Set<string>()
    for (const raw of list) {
      const name = raw.trim()
      const key = name.toLowerCase()
      if (!name) continue
      const variants = spellings.get(key) ?? new Map<string, number>()
      variants.set(name, (variants.get(name) ?? 0) + 1)
      spellings.set(key, variants)
      if (!seen.has(key)) {
        seen.add(key)
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const best = [...(spellings.get(key) ?? [])].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
      return { name: best ? best[0] : key, count }
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export async function getTechnologyCounts(): Promise<TechCount[]> {
  try {
    const { data, error } = await withTimeout(
      getClient().from('projects').select('technologies').eq('publication_state', 'published').limit(500),
    )
    if (error) throw error
    return aggregateTechnologies(
      (data ?? []).map((r) =>
        Array.isArray(r.technologies) ? (r.technologies as unknown[]).filter((t): t is string => typeof t === 'string') : [],
      ),
    )
  } catch (e) {
    throw toAppError(e)
  }
}
