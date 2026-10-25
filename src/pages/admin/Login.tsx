import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Loader2, LogIn } from 'lucide-react'
import { LogoTile } from '../../components/Logo'
import { useAuth } from '../../hooks/useAuth'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useSeo } from '../../lib/seo'
import { FormField } from '../../components/admin/FormParts'

export default function AdminLogin() {
  const { status, signIn, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const target = from && from.startsWith('/admin') ? from : '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useSeo({ title: 'Admin login', noindex: true })

  if (status === 'admin') return <Navigate to={target} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    const result = await signIn(email, password)
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    navigate(target, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoTile className="h-14 w-14 !rounded-2xl" />
          <h1 className="text-2xl font-semibold text-fg">Admin sign in</h1>
          <p className="text-sm text-muted">Owner access only.</p>
        </div>

        {!isSupabaseConfigured && (
          <p role="alert" className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-fg">
            Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart.
          </p>
        )}

        {status === 'not-admin' && (
          <div role="alert" className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-fg">
            This account is signed in but is not authorized as an admin.{' '}
            <button type="button" className="underline" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        )}

        <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
          <FormField label="Email" htmlFor="login-email">
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isSupabaseConfigured}
            />
          </FormField>
          <FormField label="Password" htmlFor="login-password">
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!isSupabaseConfigured}
            />
          </FormField>

          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={busy || !isSupabaseConfigured}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link to="/" className="hover:text-fg">
            ← Back to site
          </Link>
        </p>
      </div>
    </div>
  )
}
