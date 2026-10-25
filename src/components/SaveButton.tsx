import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useSaved } from '../hooks/useSaved'

interface Props {
  slug: string
  name: string
  variant?: 'icon' | 'labeled'
  className?: string
}

export function SaveButton({ slug, name, variant = 'icon', className = '' }: Props) {
  const { isSaved, toggle } = useSaved()
  const saved = isSaved(slug)

  if (variant === 'labeled') {
    return (
      <button type="button" onClick={() => toggle(slug)} className={`btn btn-secondary ${className}`}>
        {saved ? <BookmarkCheck className="h-4 w-4 text-violet" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />}
        {saved ? 'Saved' : 'Save'}
        <span className="sr-only"> {name}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={saved}
      aria-label={`Save ${name}`}
      title={saved ? 'Remove from saved' : 'Save for later'}
      className={`glass inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 active:scale-90 ${saved ? 'text-violet' : 'text-fg'} ${className}`}
    >
      <Bookmark className={`h-[18px] w-[18px] ${saved ? 'fill-current' : ''}`} aria-hidden />
    </button>
  )
}
