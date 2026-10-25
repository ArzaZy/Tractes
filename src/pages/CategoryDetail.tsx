import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '../hooks/useQuery'
import { useSettings } from '../hooks/useSettings'
import { getCategoryBySlug } from '../lib/categories'
import { listPublicProjects } from '../lib/projects'
import { PAGE_SIZE, totalPages } from '../lib/exploreParams'
import { useSeo } from '../lib/seo'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { CategoryIcon } from '../components/CategoryIcon'
import { Pagination } from '../components/Pagination'
import { ProjectCard, ProjectGridSkeleton } from '../components/ProjectCard'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import NotFound from './NotFound'

export default function CategoryDetail() {
  const { slug = '' } = useParams()
  const { settings } = useSettings()
  const [page, setPage] = useState(1)

  const category = useQuery(() => getCategoryBySlug(slug), [slug])
  const projects = useQuery(
    () => listPublicProjects({ categorySlug: slug, sort: 'featured', page, pageSize: PAGE_SIZE }),
    [slug, page],
  )

  useSeo(
    {
      title: category.data?.name ?? 'Category',
      path: `/categories/${slug}`,
      description: category.data?.description ?? undefined,
      noindex: !category.loading && !category.data,
    },
    settings.site_name,
  )

  if (category.loading) return <Spinner />
  if (category.error) {
    return (
      <div className="container-page py-14">
        <ErrorState error={category.error} onRetry={category.reload} />
      </div>
    )
  }
  if (!category.data) {
    return <NotFound title="Category not found" message="That category does not exist." backTo="/categories" backLabel="All categories" />
  }

  const c = category.data
  return (
    <div className="container-page py-10 sm:py-14">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Categories', to: '/categories' }, { label: c.name }]} />

      <header className="mb-8 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-2 text-accent">
          <CategoryIcon name={c.icon} className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-fg">{c.name}</h1>
          {c.description && <p className="mt-1 max-w-2xl text-muted">{c.description}</p>}
          <p className="mt-2 text-sm text-muted">
            {c.published_count} published {c.published_count === 1 ? 'project' : 'projects'}
          </p>
        </div>
      </header>

      {projects.loading ? (
        <ProjectGridSkeleton count={3} />
      ) : projects.error ? (
        <ErrorState error={projects.error} onRetry={projects.reload} />
      ) : (projects.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="No projects are published in this category."
          action={
            <Link to="/explore" className="btn btn-primary">
              Explore all projects
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.data?.items.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages(projects.data?.total ?? 0)} onChange={setPage} />
        </>
      )}
    </div>
  )
}
