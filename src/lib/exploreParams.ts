import type { ProjectStatus, SortOption } from '../types'
import { PROJECT_STATUSES } from '../types'

export const PAGE_SIZE = 12

export interface ExploreState {
  q: string
  category: string
  /** Technology name as shown to the user; matched case-insensitively by the query. */
  tech: string
  status: ProjectStatus | ''
  sort: SortOption
  page: number
}

export const DEFAULT_EXPLORE: ExploreState = { q: '', category: '', tech: '', status: '', sort: 'featured', page: 1 }

const SORTS: SortOption[] = ['featured', 'newest', 'name']

/** Reads shareable filter state from the URL, tolerating garbage values. */
export function parseExploreParams(params: URLSearchParams): ExploreState {
  const sortRaw = params.get('sort') as SortOption | null
  const statusRaw = params.get('status') as ProjectStatus | null
  const pageRaw = Number.parseInt(params.get('page') ?? '1', 10)
  return {
    q: (params.get('q') ?? '').slice(0, 100),
    category: /^[a-z0-9-]{1,80}$/.test(params.get('category') ?? '') ? (params.get('category') as string) : '',
    tech: (params.get('tech') ?? '').trim().slice(0, 40),
    status: statusRaw && PROJECT_STATUSES.includes(statusRaw) ? statusRaw : '',
    sort: sortRaw && SORTS.includes(sortRaw) ? sortRaw : DEFAULT_EXPLORE.sort,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 10000) : 1,
  }
}

/** Serialises state, omitting defaults so URLs stay short and clean. */
export function buildExploreParams(state: ExploreState): URLSearchParams {
  const p = new URLSearchParams()
  if (state.q.trim()) p.set('q', state.q.trim())
  if (state.category) p.set('category', state.category)
  if (state.tech) p.set('tech', state.tech)
  if (state.status) p.set('status', state.status)
  if (state.sort !== DEFAULT_EXPLORE.sort) p.set('sort', state.sort)
  if (state.page > 1) p.set('page', String(state.page))
  return p
}

export function hasActiveFilters(state: ExploreState): boolean {
  return Boolean(state.q.trim() || state.category || state.tech || state.status || state.sort !== DEFAULT_EXPLORE.sort)
}

export function totalPages(total: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize))
}
