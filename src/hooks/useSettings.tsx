import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SiteSettings } from '../types'
import { DEFAULT_SETTINGS, getSettings } from '../lib/settings'
import { isSupabaseConfigured } from '../lib/supabase'
import { useTheme } from './useTheme'

interface SettingsContextValue {
  settings: SiteSettings
  refresh: () => void
  setSettings: (s: SiteSettings) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [nonce, setNonce] = useState(0)
  const { applyDefault } = useTheme()

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true
    getSettings()
      .then((s) => {
        if (!active) return
        setSettings(s)
        applyDefault(s.default_theme)
      })
      // Settings are cosmetic: on failure the built-in defaults keep the site usable.
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [nonce, applyDefault])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])
  const value = useMemo(() => ({ settings, refresh, setSettings }), [settings, refresh])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
