import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, CalendarDays, History, Check, Code2, ExternalLink, Pencil, RefreshCw, ShieldCheck } from 'lucide-react'
import { useQuery } from '../hooks/useQuery'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { getProjectBySlug, getPublicProject, getRelatedProjects } from '../lib/projects'
import { useSeo } from '../lib/seo'
import { formatDate, initials } from '../lib/utils'
import { listProjectUpdates } from '../lib/updates'
import { recordViewOnce } from '../lib/views'
import { safeUrlOrNull } from '../lib/validation'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { CategoryIcon } from '../components/CategoryIcon'
import { CoverFallback, ProjectCard } from '../components/ProjectCard'
import { SafeImage } from '../components/SafeImage'
import { SaveButton } from '../components/SaveButton'
import { ShareActions } from '../components/ShareActions'
import { SocialLinkList } from '../components/SocialLinks'
import { FeaturedBadge, StatusBadge } from '../components/StatusBadge'
import { ErrorState, Spinner } from '../components/States'
import NotFound from './NotFound'

export default function ProjectDetail() {
  const { slug = '' } = useParams()
  const { settings } = useSettings()
  const { status: authStatus } = useAuth()
  const isAdmin = authStatus === 'admin'
  // Admins may open drafts here; Row Level Security still hides them from everyone else.
  const project = useQuery(() => (isAdmin ? getProjectBySlug(slug) : getPublicProject(slug)), [slug, isAdmin])
  const p = project.data

  const related = useQuery(() => (p ? getRelatedProjects(p, 3) : Promise.resolve([])), [p?.id])

  const updates = useQuery(() => (p ? listProjectUpdates(p.id) : Promise.resolve([])), [p?.id])

  // Anonymous, once per project per browser session. Admin previews and drafts are not counted.
  const countable = Boolean(p) && p?.publication_state === 'published' && !isAdmin
  useEffect(() => {
    if (countable) void recordViewOnce(slug)
  }, [countable, slug])

  useSeo(
    {
      title: p?.name ?? 'Project',
      description: p?.short_description,
      path: `/projects/${slug}`,
      image: safeUrlOrNull(p?.thumbnail_url),
      noindex: (!project.loading && !p) || p?.publication_state === 'draft',
    },
    settings.site_name,
  )

  if (project.loading || authStatus === 'loading') return <Spinner label="Loading project" />
  if (project.error) {
    return (
      <div className="container-page py-14">
        <ErrorState error={project.error} onRetry={project.reload} />
      </div>
    )
  }
  // Unpublished and missing projects are indistinguishable to visitors by design.
  if (!p) {
    return (
      <NotFound
        title="Project not found"
        message="This project does not exist or is not publicly available."
        backTo="/explore"
        backLabel="Explore projects"
      />
    )
  }

  const visit = safeUrlOrNull(p.website_url)
  const docs = safeUrlOrNull(p.documentation_url)
  const source = safeUrlOrNull(p.source_code_url)

  return (
    <article className="container-page py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Explore', to: '/explore' },
          ...(p.category ? [{ label: p.category.name, to: `/categories/${p.category.slug}` }] : []),
          { label: p.name },
        ]}
      />

      {isAdmin && (
        <div role="status" className="glass mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-fg">
            <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
            Admin view{p.publication_state === 'draft' ? ' · this draft is hidden from visitors' : ''}
          </span>
          <Link to={`/admin/projects/${p.id}/edit`} className="btn btn-secondary btn-sm">
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
          </Link>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
        <div className="aspect-[21/9] w-full">
          <SafeImage
            src={p.thumbnail_url}
            alt={`${p.name} cover`}
            width={1260}
            height={540}
            priority
            className="h-full w-full object-cover"
            fallback={<CoverFallback name={p.name} slug={p.slug} />}
          />
        </div>
      </div>

      <header className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-2">
            <SafeImage
              src={p.logo_url}
              alt={`${p.name} logo`}
              width={64}
              height={64}
              className="h-full w-full object-cover"
              fallback={<span className="text-lg font-semibold text-muted">{initials(p.name)}</span>}
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{p.name}</h1>
            <p className="mt-2 max-w-2xl text-lg text-muted">{p.short_description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={p.status} />
              {p.is_featured && <FeaturedBadge />}
              {p.category && (
                <Link
                  to={`/categories/${p.category.slug}`}
                  className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted hover:text-fg"
                >
                  <CategoryIcon name={p.category.icon} className="h-3 w-3" />
                  {p.category.name}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <SaveButton slug={p.slug} name={p.name} variant="labeled" />
          {p.publication_state === 'published' && <ShareActions project={p} />}
          {visit && (
            <a href={visit} target="_blank" rel="noopener noreferrer" className="btn btn-primary !min-h-12 px-6">
              Visit Website <ExternalLink className="h-4 w-4" aria-hidden />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-10">
          {p.description && (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="mb-3 text-xl font-semibold text-fg">
                About this project
              </h2>
              {/* Rendered as plain text: user-controlled content is never injected as HTML. */}
              <p className="whitespace-pre-line leading-relaxed text-muted">{p.description}</p>
            </section>
          )}

          {(updates.data?.length ?? 0) > 0 && (
            <section aria-labelledby="history-heading">
              <h2 id="history-heading" className="mb-3 flex items-center gap-2 text-xl font-semibold text-fg">
                <History className="h-5 w-5 text-accent" aria-hidden /> Update history
              </h2>
              <ol className="space-y-3 border-l border-line pl-5">
                {updates.data?.map((u) => (
                  <li key={u.id} className="relative">
                    <span aria-hidden className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      {u.version && <span className="rounded-full border border-line px-2 py-0.5 font-semibold text-fg">v{u.version}</span>}
                      <time dateTime={u.created_at}>{formatDate(u.created_at)}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted">{u.note}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {p.features.length > 0 && (
            <section aria-labelledby="features-heading">
              <h2 id="features-heading" className="mb-3 text-xl font-semibold text-fg">
                Features
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {p.features.map((f, i) => (
                  <li key={`${f}-${i}`} className="flex items-start gap-2 glass rounded-xl p-3 text-sm text-fg">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="card space-y-4 p-5">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-muted">
                  <CalendarDays className="h-4 w-4" aria-hidden /> Published
                </dt>
                <dd className="text-fg">{formatDate(p.published_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-muted">
                  <RefreshCw className="h-4 w-4" aria-hidden /> Last updated
                </dt>
                <dd className="text-fg">{formatDate(p.updated_at)}</dd>
              </div>
            </dl>

            {(docs || source) && (
              <div className="flex flex-col gap-2 border-t border-line pt-4">
                {docs && (
                  <a href={docs} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm justify-start">
                    <BookOpen className="h-4 w-4" aria-hidden /> Documentation
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
                {source && (
                  <a href={source} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm justify-start">
                    <Code2 className="h-4 w-4" aria-hidden /> Source code
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {p.technologies.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-fg">Technologies</h2>
              <ul className="flex flex-wrap gap-2">
                {p.technologies.map((t, i) => (
                  <li key={`${t}-${i}`}>
                    <Link
                      to={`/explore?tech=${encodeURIComponent(t)}`}
                      className="inline-block rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg hover:border-accent/50"
                    >
                      {t}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <SocialLinkList links={p.social_links} />
        </aside>
      </div>

      {(related.data?.length ?? 0) > 0 && (
        <section className="mt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-6 text-2xl font-semibold tracking-tight text-fg">
            Related projects
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.data?.map((r) => (
              <ProjectCard key={r.id} project={r} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
