import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null
  return (
    <nav className="flex items-center justify-between gap-3 pt-6" aria-label="Pagination">
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
      </button>
      <p className="text-sm text-muted" aria-live="polite">
        Page {page} of {totalPages}
      </p>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  )
}
