import { useId, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  placeholder?: string
  label?: string
  large?: boolean
  autoFocus?: boolean
}

export function SearchBar({ value, onChange, onSubmit, placeholder = 'Search projects…', label = 'Search projects', large, autoFocus }: Props) {
  const id = useId()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit?.()
  }
  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted ${large ? 'h-5 w-5' : 'h-4 w-4'}`} aria-hidden />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        className={`field pl-11 pr-11 [&::-webkit-search-cancel-button]:hidden ${large ? '!min-h-14 !rounded-2xl text-base' : ''}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </form>
  )
}
