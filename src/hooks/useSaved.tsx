import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SAVED_KEY, parseSaved, toggleSaved } from '../lib/saved'

interface SavedValue {
  slugs: string[]
  count: number
  isSaved: (slug: string) => boolean
  toggle: (slug: string) => void
  remove: (slugs: string[]) => void
  clear: () => void
}

// Safe default so components work (as "nothing saved") outside the provider, e.g. in tests.
const EMPTY: SavedValue = {
  slugs: [],
  count: 0,
  isSaved: () => false,
  toggle: () => undefined,
  remove: () => undefined,
  clear: () => undefined,
}

const SavedContext = createContext<SavedValue>(EMPTY)

function read(): string[] {
  try {
    return parseSaved(localStorage.getItem(SAVED_KEY))
  } catch {
    return []
  }
}

function write(list: string[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable: the list lasts for this session only */
  }
}

/** Visitor's saved projects. Stored only in their own browser; no account needed. */
export function SavedProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>(read)

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_KEY || e.key === null) setSlugs(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const update = useCallback((fn: (list: string[]) => string[]) => {
    setSlugs((prev) => {
      const next = fn(prev)
      write(next)
      return next
    })
  }, [])

  const value = useMemo<SavedValue>(
    () => ({
      slugs,
      count: slugs.length,
      isSaved: (slug) => slugs.includes(slug),
      toggle: (slug) => update((l) => toggleSaved(l, slug)),
      remove: (gone) => update((l) => l.filter((s) => !gone.includes(s))),
      clear: () => update(() => []),
    }),
    [slugs, update],
  )

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>
}

export function useSaved(): SavedValue {
  return useContext(SavedContext)
}
