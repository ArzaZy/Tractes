import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useSeo } from '../lib/seo'

interface Props {
  title?: string
  message?: string
  backTo?: string
  backLabel?: string
}

export default function NotFound({
  title = 'Page not found',
  message = 'The page you are looking for does not exist or is no longer available.',
  backTo = '/explore',
  backLabel = 'Explore projects',
}: Props) {
  useSeo({ title, noindex: true })
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface-2 text-accent">
        <Compass className="h-7 w-7" aria-hidden />
      </div>
      <p className="text-sm font-semibold tracking-widest text-accent">404</p>
      <h1 className="text-3xl font-bold tracking-tight text-fg">{title}</h1>
      <p className="max-w-md text-muted">{message}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn btn-primary">
          Back to home
        </Link>
        <Link to={backTo} className="btn btn-secondary">
          {backLabel}
        </Link>
      </div>
    </div>
  )
}
