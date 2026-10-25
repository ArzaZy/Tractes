import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'traclabs-theme'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
  /** Applies the admin's default only when the visitor has not chosen a theme. */
  applyDefault: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readStored() ?? 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', theme === 'dark' ? '#09090d' : '#f4f1fb')
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      // Only the visitor's own preference is stored; no data or auth lives here.
      try {
        localStorage.setItem(KEY, next)
      } catch {
        /* storage unavailable: preference lasts for this session only */
      }
      return next
    })
  }, [])

  const applyDefault = useCallback((t: Theme) => {
    if (readStored() === null) setTheme(t)
  }, [])

  const value = useMemo(() => ({ theme, toggle, applyDefault }), [theme, toggle, applyDefault])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
