import { Link } from 'react-router-dom'
import { ExternalLink, FilePlus2, Settings, Sparkles, Star, Tags } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import { getDashboardStats } from '../../lib/projects'
import { completeness } from '../../lib/completeness'
import { CHANGELOG } from '../../data/changelog'
import { PROJECT_STATUSES } from '../../types'
import { STATUS_LABELS, formatDate } from '../../lib/utils'
import { EmptyState, ErrorState, Spinner } from '../../components/States'
import { PublicationBadge, StatusBadge } from '../../components/StatusBadge'
import { CompletenessBar } from '../../components/admin/Completeness'
import { ViewsCard } from '../../components/admin/ViewsCard'

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Good morning'
  if (h < 15) return 'Good afternoon'
  if (h < 19) return 'Good evening'
  return 'Good night'
}

const QUICK = [
  { to: '/admin/projects/new', label: 'New project', icon: FilePlus2 },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function Dashboard() {
  const { session } = useAuth()
  const { data, loading, error, reload } = useQuery(getDashboardStats, [])
  const name = session?.user.email?.split('@')[0]
  const release = CHANGELOG[0]!

  const attention = (data?.drafts ?? [])
    .map((p) => ({ p, c: completeness(p) }))
    .sort((a, b) => a.c.score - b.c.score)
    .slice(0, 4)

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-sm text-muted">{greeting()}{name ? `, ${name}` : ''}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Overview</h1>
      </header>

      <nav aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="card flex items-center gap-3 p-4 transition hover:border-accent/50">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface-2 text-accent">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm font-medium text-fg">{label}</span>
          </Link>
        ))}
        <a href="/" target="_blank" rel="noopener noreferrer" className="card flex items-center gap-3 p-4 transition hover:border-accent/50">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface-2 text-accent">
            <ExternalLink className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-medium text-fg">
            View site<span className="sr-only"> (opens in a new tab)</span>
          </span>
        </a>
      </nav>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data || data.total === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Add your first project to start filling the directory. New projects are saved as drafts until you publish them."
          action={
            <Link to="/admin/projects/new" className="btn btn-primary">
              Create your first project
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Total projects" value={data.total} />
            <Stat label="Published" value={data.published} hint="Visible to visitors" />
            <Stat label="Drafts" value={data.draft} hint="Only you can see these" />
            <Stat label="Featured" value={data.featured} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5" aria-labelledby="by-status">
              <h2 id="by-status" className="mb-4 text-base font-semibold text-fg">
                Projects by status
              </h2>
              <ul className="space-y-3">
                {PROJECT_STATUSES.map((s) => {
                  const n = data.byStatus[s]
                  const pct = data.total ? Math.round((n / data.total) * 100) : 0
                  return (
                    <li key={s}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-fg">{STATUS_LABELS[s]}</span>
                        <span className="text-muted">{n}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="presentation">
                        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className="card p-5" aria-labelledby="attention">
              <h2 id="attention" className="text-base font-semibold text-fg">
                Drafts to finish
              </h2>
              <p className="mb-3 text-xs text-muted">Least complete first.</p>
              {attention.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">No drafts. Everything is published.</p>
              ) : (
                <ul className="space-y-3">
                  {attention.map(({ p, c }) => (
                    <li key={p.id}>
                      <Link to={`/admin/projects/${p.id}/edit`} className="block rounded-xl p-2 hover:bg-surface-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-medium text-fg">{p.name}</span>
                          <CompletenessBar score={c.score} />
                        </div>
                        <p className="mt-1 truncate text-xs text-muted">
                          {c.missing.length === 0 ? 'Ready to publish' : `Missing: ${c.missing.slice(0, 3).join(', ')}${c.missing.length > 3 ? '…' : ''}`}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="card" aria-labelledby="recent">
            <div className="flex items-center justify-between p-5 pb-3">
              <h2 id="recent" className="text-base font-semibold text-fg">
                Recently updated
              </h2>
              <Link to="/admin/projects" className="text-sm text-accent hover:underline">
                All projects
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {data.recent.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/projects/${p.id}/edit`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-fg">{p.name}</span>
                      {p.is_featured && <Star className="h-3.5 w-3.5 shrink-0 text-violet" aria-label="Featured" />}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      <PublicationBadge state={p.publication_state} />
                      <span className="hidden text-xs text-muted sm:inline">{formatDate(p.updated_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <ViewsCard />

      <section className="card p-5" aria-labelledby="release">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="release" className="flex items-center gap-2 text-base font-semibold text-fg">
            <Sparkles className="h-4 w-4 text-violet" aria-hidden /> What's new in v{release.version}
          </h2>
          <Link to="/changelog" className="text-sm text-accent hover:underline">
            Full changelog
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted">
          {release.title} · {formatDate(release.date)}
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          {release.changes.slice(0, 3).map((c, i) => (
            <li key={i}>{c.text}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
