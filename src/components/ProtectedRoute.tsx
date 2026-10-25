import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LogOut, ShieldAlert } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from './States'
import { isSupabaseConfigured } from '../lib/supabase'

/**
 * Usability layer only. The real security boundary is Row Level Security in the
 * database: even if this component were bypassed, writes would still be denied.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status, signOut } = useAuth()
  const location = useLocation()

  if (!isSupabaseConfigured) return <Navigate to="/admin/login" replace />
  if (status === 'loading') return <Spinner label="Checking session" />
  if (status === 'anonymous') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />

  if (status === 'not-admin') {
    return (
      <div role="alert" className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 text-red-500">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold text-fg">Access denied</h1>
        <p className="text-sm text-muted">This account is not authorized to manage TracLabs.</p>
        <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </div>
    )
  }

  return <>{children}</>
}
