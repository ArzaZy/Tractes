import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react'
import type { AppError } from '../lib/errors'

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface-2 text-muted">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden />}
      </div>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: AppError | { message: string }; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 text-red-500">
        <TriangleAlert className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-fg">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted">{error.message}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn btn-primary">
            <RefreshCw className="h-4 w-4" aria-hidden /> Try again
          </button>
        )}
        <Link to="/" className="btn btn-secondary">
          Go home
        </Link>
      </div>
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none" aria-hidden />
      {label}…
    </div>
  )
}
