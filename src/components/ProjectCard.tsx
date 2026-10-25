import { Link } from 'react-router-dom'
import { ArrowUpRight, ExternalLink } from 'lucide-react'
import type { ProjectWithCategory } from '../types'
import { hueFromString, initials } from '../lib/utils'
import { safeUrlOrNull } from '../lib/validation'
import { SafeImage } from './SafeImage'
import { FeaturedBadge, StatusBadge } from './StatusBadge'
import { CategoryIcon } from './CategoryIcon'
import { SaveButton } from './SaveButton'
import { trackGlint } from '../lib/glint'

/** Generated CSS cover used when there is no (working) thumbnail. */
export function CoverFallback({ name, slug }: { name: string; slug: string }) {
  const h = hueFromString(slug)
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        background: `radial-gradient(circle at 20% 20%, hsl(${h} 80% 55% / 0.35), transparent 55%), radial-gradient(circle at 85% 90%, hsl(${(h + 60) % 360} 80% 55% / 0.28), transparent 55%), var(--surface-2)`,
      }}
      aria-hidden="true"
    >
      <span className="text-3xl font-semibold tracking-tight text-fg/70">{initials(name)}</span>
    </div>
  )
}

export function ProjectCard({ project }: { project: ProjectWithCategory }) {
  const visit = safeUrlOrNull(project.website_url)
  return (
    <article onPointerMove={trackGlint} className="card card-glint group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-accent/50 motion-reduce:transform-none">
      <Link to={`/projects/${project.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-surface-2" tabIndex={-1} aria-hidden="true">
        <SafeImage
          src={project.thumbnail_url}
          alt=""
          width={640}
          height={360}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
          fallback={<CoverFallback name={project.name} slug={project.slug} />}
        />
      </Link>
      <SaveButton slug={project.slug} name={project.name} className="absolute right-3 top-3 z-10" />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2">
            <SafeImage
              src={project.logo_url}
              alt={`${project.name} logo`}
              width={40}
              height={40}
              className="h-full w-full object-cover"
              fallback={<span className="text-sm font-semibold text-muted">{initials(project.name)}</span>}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-fg">
              <Link to={`/projects/${project.slug}`} className="hover:text-accent">
                {project.name}
              </Link>
            </h3>
            {project.category && (
              <Link
                to={`/categories/${project.category.slug}`}
                className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
              >
                <CategoryIcon name={project.category.icon} className="h-3.5 w-3.5" />
                {project.category.name}
              </Link>
            )}
          </div>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted">{project.short_description}</p>

        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={project.status} />
          {project.is_featured && <FeaturedBadge />}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Link to={`/projects/${project.slug}`} className="btn btn-secondary btn-sm flex-1">
            View Details <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          {visit && (
            <a
              href={visit}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm flex-1"
              aria-label={`Visit ${project.name} website (opens in a new tab)`}
            >
              Visit Website <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="skeleton aspect-[16/9] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-3 w-1/3" />
          </div>
        </div>
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-4/5" />
        <div className="skeleton h-8 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function ProjectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading projects">
      {Array.from({ length: count }, (_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  )
}
