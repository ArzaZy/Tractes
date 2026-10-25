import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Shuffle } from 'lucide-react'
import { useSurprise } from '../hooks/useSurprise'
import { useQuery } from '../hooks/useQuery'
import { useSettings } from '../hooks/useSettings'
import { listPublicProjects } from '../lib/projects'
import { listCategoriesWithCounts } from '../lib/categories'
import { useSeo } from '../lib/seo'
import { SearchBar } from '../components/SearchBar'
import { ProjectCard, ProjectGridSkeleton } from '../components/ProjectCard'
import { LogoMark } from '../components/Logo'
import { CategoryIcon } from '../components/CategoryIcon'
import { EmptyState, ErrorState } from '../components/States'
import type { PagedResult, ProjectWithCategory } from '../types'

function Section({ title, subtitle, to, children }: { title: string; subtitle?: string; to?: string; children: ReactNode }) {
  return (
    <section className="container-page mt-20" aria-labelledby={`h-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 id={`h-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-2xl font-semibold tracking-tight text-fg">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {to && (
          <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:underline">
            View All <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function Grid({ state, retry }: { state: { data: PagedResult<ProjectWithCategory> | null; loading: boolean; error: { message: string } | null }; retry: () => void }) {
  if (state.loading) return <ProjectGridSkeleton count={3} />
  if (state.error) return <ErrorState error={state.error} onRetry={retry} />
  const items = state.data?.items ?? []
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { surprise, busy: surprising } = useSurprise()
  const [q, setQ] = useState('')

  useSeo(
    { path: '/', title: settings.seo_title || undefined, description: settings.seo_description || undefined },
    settings.site_name,
    'Discover useful tools, websites, and digital experiences built at TracLabs.',
  )

  const featured = useQuery(() => listPublicProjects({ featuredOnly: true, pageSize: 6, sort: 'featured' }), [])
  const recent = useQuery(() => listPublicProjects({ sort: 'newest', pageSize: 6 }), [])
  const all = useQuery(() => listPublicProjects({ sort: 'name', pageSize: 6 }), [])
  const cats = useQuery(() => listCategoriesWithCounts({ onlyWithProjects: true }), [])

  const goSearch = () => navigate(q.trim() ? `/explore?q=${encodeURIComponent(q.trim())}` : '/explore')

  const nothingPublished = !all.loading && !all.error && (all.data?.total ?? 0) === 0

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="hero-backdrop" aria-hidden="true">
          <span className="hero-aurora -left-24 top-0 h-72 w-72 bg-[#7c4dff]/40" />
          <span className="hero-aurora -right-20 top-10 h-64 w-64 bg-[#b69cfc]/30 [animation-delay:-6s]" />
          <LogoMark className="hero-mark" />
        </div>
        <div className="container-page relative py-16 text-center sm:py-24">
          <p className="mb-4 inline-block glass rounded-full px-3 py-1 text-xs font-semibold tracking-[0.18em] text-accent">
            THE DIGITAL PROJECT HUB
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-fg sm:text-6xl">Explore What We've Built.</h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">
            A curated home for our websites, tools, and digital experiments.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <SearchBar value={q} onChange={setQ} onSubmit={goSearch} large placeholder="Search tools, websites, projects…" />
          </div>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/explore" className="btn btn-primary w-full sm:w-auto">
              Explore Projects <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link to="/categories" className="btn btn-secondary w-full sm:w-auto">
              Discover Categories
            </Link>
            <button type="button" onClick={() => void surprise()} disabled={surprising} className="btn btn-ghost w-full sm:w-auto">
              <Shuffle className="h-4 w-4" aria-hidden /> {surprising ? 'Finding one…' : 'Surprise me'}
            </button>
          </div>
        </div>
      </section>

      {nothingPublished ? (
        <div className="container-page mt-16">
          <EmptyState
            title="No projects published yet"
            description="Projects will appear here as soon as the owner publishes them from the admin dashboard."
          />
        </div>
      ) : (
        <>
          {(featured.loading || featured.error || (featured.data?.items.length ?? 0) > 0) && (
            <Section title="Featured projects" subtitle="Hand-picked highlights." to="/explore?sort=featured">
              <Grid state={featured} retry={featured.reload} />
            </Section>
          )}

          {(cats.loading || cats.error || (cats.data?.length ?? 0) > 0) && (
            <Section title="Categories" subtitle="Browse by what you need." to="/categories">
              {cats.loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading categories">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="skeleton h-20" />
                  ))}
                </div>
              ) : cats.error ? (
                <ErrorState error={cats.error} onRetry={cats.reload} />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(cats.data ?? []).map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/categories/${c.slug}`}
                        className="card flex items-center gap-3 p-4 transition hover:border-accent/50"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-accent">
                          <CategoryIcon name={c.icon} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-fg">{c.name}</span>
                          <span className="block text-xs text-muted">
                            {c.published_count} {c.published_count === 1 ? 'project' : 'projects'}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          <Section title="Recently added" subtitle="The newest published projects." to="/explore?sort=newest">
            <Grid state={recent} retry={recent.reload} />
          </Section>

          <Section title="Explore all" subtitle="A quick look at the full directory." to="/explore?sort=name">
            <Grid state={all} retry={all.reload} />
            {!all.loading && !all.error && (all.data?.total ?? 0) > 6 && (
              <div className="mt-6 text-center">
                <Link to="/explore" className="btn btn-secondary">
                  Browse all {all.data?.total} projects
                </Link>
              </div>
            )}
          </Section>
        </>
      )}
    </>
  )
}
