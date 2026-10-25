import { CHANGELOG, type ChangeKind } from '../data/changelog'
import { useSettings } from '../hooks/useSettings'
import { useSeo } from '../lib/seo'
import { formatDate } from '../lib/utils'

const KIND: Record<ChangeKind, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  improved: { label: 'Improved', cls: 'border-accent/40 bg-accent/10 text-accent' },
  fixed: { label: 'Fixed', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400' },
}

export default function Changelog() {
  const { settings } = useSettings()
  useSeo({ title: 'Changelog', path: '/changelog', description: `What's new in ${settings.site_name}.` }, settings.site_name)

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Changelog</h1>
        <p className="mt-2 text-muted">Every release of {settings.site_name}, newest first.</p>
      </header>

      <ol className="relative space-y-6 border-l border-line pl-6 sm:pl-8">
        {CHANGELOG.map((r, i) => (
          <li key={r.version} className="relative">
            <span
              className={`absolute -left-[1.95rem] top-6 h-3 w-3 rounded-full border-2 border-bg sm:-left-[2.45rem] ${i === 0 ? 'bg-accent shadow-[0_0_14px_var(--glow)]' : 'bg-muted'}`}
              aria-hidden="true"
            />
            <article className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-xl font-semibold text-fg">v{r.version}</h2>
                {i === 0 && <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Latest</span>}
                <time dateTime={r.date} className="text-sm text-muted">
                  {formatDate(r.date)}
                </time>
              </div>
              <p className="mt-1 text-sm font-medium text-fg">{r.title}</p>
              <ul className="mt-4 space-y-2.5">
                {r.changes.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-muted">
                    <span className={`mt-0.5 inline-flex w-[4.5rem] shrink-0 justify-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${KIND[c.kind].cls}`}>
                      {KIND[c.kind].label}
                    </span>
                    <span className="leading-relaxed">{c.text}</span>
                  </li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>
    </div>
  )
}
