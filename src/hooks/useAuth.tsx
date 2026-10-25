import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getClient, isSupabaseConfigured } from '../lib/supabase'

export type AuthStatus = 'loading' | 'anonymous' | 'not-admin' | 'admin'

interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Asks the database whether the signed-in user is in the admin allowlist.
 * This is only used to decide what to render; every write is independently
 * enforced by Row Level Security.
 */
async function checkAdmin(): Promise<boolean> {
  const { data, error } = await getClient().rpc('is_admin')
  return !error && data === true
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'anonymous')
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true
    const client = getClient()

    const resolve = async (s: Session | null) => {
      if (!active) return
      setSession(s)
      if (!s) {
        setStatus('anonymous')
        return
      }
      try {
        const admin = await checkAdmin()
        if (active) setStatus(admin ? 'admin' : 'not-admin')
      } catch {
        if (active) setStatus('not-admin')
      }
    }

    client.auth.getSession().then(({ data }) => resolve(data.session))

    // Fires on sign-in, sign-out and automatic token refresh.
    const { data: sub } = client.auth.onAuthStateChange((event, s) => {
      if (event === 'TOKEN_REFRESHED') {
        if (active) setSession(s)
        return
      }
      // Defer to avoid calling Supabase inside the auth callback.
      setTimeout(() => void resolve(s), 0)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    try {
      const { error } = await getClient().auth.signInWithPassword({ email: email.trim(), password })
      if (error) return { ok: false, message: 'Invalid email or password.' }
      return { ok: true }
    } catch {
      return { ok: false, message: 'Could not reach the server. Please try again.' }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await getClient().auth.signOut()
    } finally {
      setSession(null)
      setStatus('anonymous')
    }
  }, [])

  const value = useMemo(() => ({ status, session, signIn, signOut }), [status, session, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
