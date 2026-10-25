import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Search, X } from 'lucide-react'
import type { ProjectWithCategory } from '../types'
import { useDebounce } from '../hooks/useDebounce'
import { searchPublicProjects } from '../lib/projects'
import { isSupabaseConfigured } from '../lib/supabase'

interface Props {
  open: boolean
  onClose: () => void
}

/** Command-palette style search. Works with keyboard (arrows/enter/esc) and touch. */
export function SearchOverlay({ open, onClose }: Props) {
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 250)
  const [results, setResults] = useState<ProjectWithCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      setTimeout(() => inputRef.current?.focus(), 0)
    }
    if (!open && d.open) d.close()
  }, [open])

  useEffect(() => {
    const term = debounced.trim()
    if (!open || !term || !isSupabaseConfigured) {
      setResults([])
      setLoading(false)
      setFailed(false)
      return
    }
    let live = true
    setLoading(true)
    setFailed(false)
    searchPublicProjects(term)
      .then((r) => {
        if (live) {
          setResults(r)
          setActive(0)
        }
      })
      .catch(() => live && setFailed(true))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [debounced, open])

  const close = () => {
    setQuery('')
    onClose()
  }

  const go = (to: string) => {
    close()
    navigate(to)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = results[active]
      if (hit) go(`/projects/${hit.slug}`)
      else if (query.trim()) go(`/explore?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const term = query.trim()
  const settled = term && debounced.trim() === term && !loading

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) close()
      }}
      aria-label="Search projects"
      className="mx-auto mt-[8vh] w-[calc(100%-1.5rem)] max-w-xl glass-strong rounded-3xl p-0 text-fg shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search projects…"
          aria-label="Search projects"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          className="h-14 w-full bg-transparent text-base text-fg outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted motion-reduce:animate-none" aria-label="Searching" />}
        {query && (
          <button type="button" onClick={() => setQuery('')} className="rounded p-1 text-muted hover:text-fg" aria-label="Clear search">
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
        <button type="button" onClick={close} className="btn btn-ghost btn-sm" aria-label="Close search">
          Esc
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2" aria-live="polite">
        {!isSupabaseConfigured && <p className="px-3 py-6 text-center text-sm text-muted">Search is unavailable until the database is configured.</p>}
        {isSupabaseConfigured && !term && <p className="px-3 py-6 text-center text-sm text-muted">Type to search published projects.</p>}
        {failed && <p className="px-3 py-6 text-center text-sm text-red-500">Search failed. Please try again.</p>}
        {settled && !failed && results.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted">No projects match “{term}”.</p>
        )}
        {results.length > 0 && (
          <ul id={listId} role="listbox" aria-label="Results">
            {results.map((p, i) => (
              <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onClick={() => go(`/projects/${p.slug}`)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left ${
                    i === active ? 'bg-surface-2' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{p.name}</span>
                    <span className="block truncate text-xs text-muted">{p.short_description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {term && (
          <button
            type="button"
            onClick={() => go(`/explore?q=${encodeURIComponent(term)}`)}
            className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm text-accent hover:bg-surface-2"
          >
            See all results for “{term}” <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </dialog>
  )
}
