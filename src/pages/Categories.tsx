import { Link } from 'react-router-dom'
import { useQuery } from '../hooks/useQuery'
import { useSettings } from '../hooks/useSettings'
import { listCategoriesWithCounts } from '../lib/categories'
import { useSeo } from '../lib/seo'
import { CategoryIcon } from '../components/CategoryIcon'
import { EmptyState, ErrorState } from '../components/States'

export default function Categories() {
  const { settings } = useSettings()
  useSeo({ title: 'Categories', path: '/categories', description: 'Browse TracLabs projects by category.' }, settings.site_name)
  const { data, loading, error, reload } = useQuery(() => listCategoriesWithCounts(), [])

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Categories</h1>
        <p className="mt-2 text-muted">Find projects by what they do.</p>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading categories">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-36" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No categories yet" description="Categories will appear once the owner creates them." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((c) => (
            <li key={c.id}>
              <Link to={`/categories/${c.slug}`} className="card flex h-full flex-col gap-3 p-5 transition hover:border-accent/50">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface-2 text-accent">
                  <CategoryIcon name={c.icon} className="h-5 w-5" />
                </span>
                <span className="text-lg font-semibold text-fg">{c.name}</span>
                {c.description && <span className="line-clamp-2 text-sm text-muted">{c.description}</span>}
                <span className="mt-auto text-xs font-medium text-muted">
                  {c.published_count} published {c.published_count === 1 ? 'project' : 'projects'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
