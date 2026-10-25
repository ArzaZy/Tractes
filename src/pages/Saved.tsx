import { Link } from 'react-router-dom'
import { Bookmark, Trash2 } from 'lucide-react'
import { useQuery } from '../hooks/useQuery'
import { useSaved } from '../hooks/useSaved'
import { useSettings } from '../hooks/useSettings'
import { listProjectsBySlugs } from '../lib/projects'
import { useSeo } from '../lib/seo'
import { ProjectCard, ProjectGridSkeleton } from '../components/ProjectCard'
import { EmptyState, ErrorState } from '../components/States'

export default function Saved() {
  const { settings } = useSettings()
  const { slugs, remove, clear } = useSaved()
  useSeo({ title: 'Saved', path: '/saved', noindex: true }, settings.site_name)

  const { data, loading, error, reload } = useQuery(() => listProjectsBySlugs(slugs), [slugs.join(',')])

  const found = new Set((data ?? []).map((p) => p.slug))
  const missing = loading ? [] : slugs.filter((s) => !found.has(s))

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Saved</h1>
          <p className="mt-2 text-muted">Projects you bookmarked. Kept only in this browser, no account needed.</p>
        </div>
        {slugs.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
            <Trash2 className="h-4 w-4" aria-hidden /> Clear all
          </button>
        )}
      </header>

      {slugs.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" aria-hidden />}
          title="Nothing saved yet"
          description="Tap the bookmark on any project to keep it here for later."
          action={
            <Link to="/explore" className="btn btn-primary">
              Explore projects
            </Link>
          }
        />
      ) : loading ? (
        <ProjectGridSkeleton count={Math.min(slugs.length, 6)} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          {(data ?? []).length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data?.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
          {missing.length > 0 && (
            <div role="status" className="glass mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm">
              <span className="text-muted">
                {missing.length} saved {missing.length === 1 ? 'project is' : 'projects are'} no longer available.
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => remove(missing)}>
                Remove {missing.length === 1 ? 'it' : 'them'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
