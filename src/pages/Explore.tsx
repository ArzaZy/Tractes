import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { useQuery } from '../hooks/useQuery'
import { useDebounce } from '../hooks/useDebounce'
import { useSettings } from '../hooks/useSettings'
import { getTechnologyCounts, listPublicProjects } from '../lib/projects'
import { listCategoriesWithCounts } from '../lib/categories'
import {
  PAGE_SIZE,
  buildExploreParams,
  hasActiveFilters,
  parseExploreParams,
  totalPages,
  type ExploreState,
} from '../lib/exploreParams'
import { useSeo } from '../lib/seo'
import { PROJECT_STATUSES, type SortOption } from '../types'
import { STATUS_LABELS } from '../lib/utils'
import { SearchBar } from '../components/SearchBar'
import { ProjectCard, ProjectGridSkeleton } from '../components/ProjectCard'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorState } from '../components/States'

export default function Explore() {
  const [params, setParams] = useSearchParams()
  const state = useMemo(() => parseExploreParams(params), [params])
  const { settings } = useSettings()

  // The input keeps its own value for instant typing; the URL (and query) follow after a pause.
  const [text, setText] = useState(state.q)
  const debounced = useDebounce(text, 350)

  useSeo(
    { title: 'Explore', path: '/explore', description: 'Browse every published project, tool and website built at TracLabs.' },
    settings.site_name,
  )

  const update = (patch: Partial<ExploreState>, resetPage = true) => {
    const next = { ...state, ...patch, page: resetPage ? 1 : (patch.page ?? state.page) }
    setParams(buildExploreParams(next), { replace: true })
  }

  // Sync typed text -> URL.
  useEffect(() => {
    if (debounced.trim() !== state.q.trim()) {
      setParams(buildExploreParams({ ...state, q: debounced, page: 1 }), { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  // Sync URL -> typed text (back/forward, clear filters).
  useEffect(() => {
    setText((t) => (t.trim() === state.q.trim() ? t : state.q))
  }, [state.q])

  const cats = useQuery(() => listCategoriesWithCounts({ onlyWithProjects: true }), [])
  const techs = useQuery(() => getTechnologyCounts(), [])
  const result = useQuery(
    () =>
      listPublicProjects({
        search: state.q,
        categorySlug: state.category,
        tech: state.tech,
        status: state.status,
        sort: state.sort,
        page: state.page,
        pageSize: PAGE_SIZE,
      }),
    [state.q, state.category, state.tech, state.status, state.sort, state.page],
  )

  const pages = totalPages(result.data?.total ?? 0)
  const active = hasActiveFilters(state)

  const clearAll = () => {
    setText('')
    setParams(new URLSearchParams(), { replace: true })
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Explore</h1>
        <p className="mt-2 text-muted">Search and filter every published project.</p>
      </header>

      <div className="mb-8 space-y-4">
        <SearchBar value={text} onChange={setText} large />

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="f-category" className="mb-1 block text-xs font-medium text-muted">
              Category
            </label>
            <select
              id="f-category"
              className="field"
              value={state.category}
              onChange={(e) => update({ category: e.target.value })}
            >
              <option value="">All categories</option>
              {(cats.data ?? []).map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name} ({c.published_count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-status" className="mb-1 block text-xs font-medium text-muted">
              Status
            </label>
            <select
              id="f-status"
              className="field"
              value={state.status}
              onChange={(e) => update({ status: e.target.value as ExploreState['status'] })}
            >
              <option value="">Any status</option>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-sort" className="mb-1 block text-xs font-medium text-muted">
              Sort by
            </label>
            <select id="f-sort" className="field" value={state.sort} onChange={(e) => update({ sort: e.target.value as SortOption })}>
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        {(techs.data?.length ?? 0) > 0 && (
          <div role="group" aria-label="Filter by technology" className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Technology</span>
            {(techs.data ?? []).slice(0, 14).map((t) => {
              const on = state.tech.toLowerCase() === t.name.toLowerCase()
              return (
                <button
                  key={t.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update({ tech: on ? '' : t.name })}
                  className={`glass rounded-full px-3 py-1 text-xs font-medium transition-colors ${on ? 'text-violet ring-1 ring-violet/60' : 'text-muted hover:text-fg'}`}
                >
                  {t.name} <span className="opacity-60">{t.count}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex min-h-8 items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {result.loading ? 'Loading…' : result.error ? '' : `${result.data?.total ?? 0} ${(result.data?.total ?? 0) === 1 ? 'project' : 'projects'}`}
          </p>
          {active && (
            <button type="button" onClick={clearAll} className="btn btn-ghost btn-sm">
              <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
            </button>
          )}
        </div>
      </div>

      {result.loading ? (
        <ProjectGridSkeleton count={PAGE_SIZE / 2} />
      ) : result.error ? (
        <ErrorState error={result.error} onRetry={result.reload} />
      ) : (result.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title={active ? 'No projects match your filters' : 'No projects published yet'}
          description={active ? 'Try a different search term or clear the filters.' : 'Check back soon.'}
          action={
            active ? (
              <button type="button" onClick={clearAll} className="btn btn-primary">
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.data?.items.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
          <Pagination
            page={Math.min(state.page, pages)}
            totalPages={pages}
            onChange={(page) => {
              update({ page }, false)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        </>
      )}
    </div>
  )
}
