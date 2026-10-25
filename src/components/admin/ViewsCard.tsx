import { Link } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import { useQuery } from '../../hooks/useQuery'
import { getViewStats } from '../../lib/views'

/** Privacy-friendly page views: daily totals per project, no visitor identifiers stored. */
export function ViewsCard() {
  const { data, loading, error } = useQuery(getViewStats, [])
  const max = Math.max(1, ...(data?.daily.map((d) => d.views) ?? [1]))

  return (
    <section className="card p-5" aria-labelledby="views-heading">
      <h2 id="views-heading" className="flex items-center gap-2 text-base font-semibold text-fg">
        <BarChart3 className="h-4 w-4 text-accent" aria-hidden /> Views (last 30 days)
      </h2>
      {loading ? (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      ) : error || !data ? (
        <p className="mt-3 text-sm text-muted">
          View statistics are unavailable. Run the v1.2.0 migration (<code>20261024000001_v1_2_features.sql</code>) to enable them.
        </p>
      ) : data.total === 0 ? (
        <p className="mt-3 text-sm text-muted">No views recorded yet. Counts appear once visitors open published project pages.</p>
      ) : (
        <div className="mt-3 grid gap-5 sm:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-3xl font-semibold tracking-tight text-fg">{data.total}</p>
            <p className="text-xs text-muted">{data.today} today</p>
            <div className="mt-3 flex h-16 items-end gap-1" role="img" aria-label={`Daily views over the last ${data.daily.length} days`}>
              {data.daily.map((d) => (
                <span
                  key={d.day}
                  title={`${d.day}: ${d.views}`}
                  className="flex-1 rounded-t bg-accent/70"
                  style={{ height: `${Math.max(4, (d.views / max) * 100)}%` }}
                />
              ))}
            </div>
          </div>
          <ol className="space-y-1.5 text-sm">
            {data.top.map((t) => (
              <li key={t.project_id} className="flex items-center justify-between gap-3">
                <Link to={`/projects/${t.slug}`} className="truncate text-fg hover:text-accent">{t.name}</Link>
                <span className="text-muted">{t.views}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
