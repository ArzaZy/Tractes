import { Star } from 'lucide-react'
import type { ProjectStatus, PublicationState } from '../types'
import { STATUS_LABELS } from '../lib/utils'

const STYLES: Record<ProjectStatus, string> = {
  live: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  beta: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  development: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  archived: 'border-slate-500/40 bg-slate-500/10 text-muted',
}

const base = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium'

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`${base} ${STYLES[status]}`}>{STATUS_LABELS[status]}</span>
}

export function FeaturedBadge() {
  return (
    <span className={`${base} border-violet/40 bg-violet/10 text-violet`}>
      <Star className="h-3 w-3" aria-hidden /> Featured
    </span>
  )
}

export function PublicationBadge({ state }: { state: PublicationState }) {
  return (
    <span
      className={`${base} ${
        state === 'published' ? 'border-accent/40 bg-accent/10 text-accent' : 'border-line bg-surface-2 text-muted'
      }`}
    >
      {state === 'published' ? 'Published' : 'Draft'}
    </span>
  )
}
