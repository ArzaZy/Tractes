import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { AuthStatus } from '../hooks/useAuth'

let mockStatus: AuthStatus = 'anonymous'

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ status: mockStatus, session: null, signIn: vi.fn(), signOut: vi.fn() }),
}))
vi.mock('../lib/supabase', () => ({ isSupabaseConfigured: true, getClient: vi.fn() }))

import { ProtectedRoute } from './ProtectedRoute'

function renderAt(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/login" element={<p>login page</p>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <p>secret dashboard</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockStatus = 'anonymous'
  })

  it('redirects anonymous visitors to the login page', () => {
    renderAt()
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('secret dashboard')).not.toBeInTheDocument()
  })

  it('shows a loading state while the session is checked', () => {
    mockStatus = 'loading'
    renderAt()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('secret dashboard')).not.toBeInTheDocument()
  })

  it('denies signed-in users that are not on the admin allowlist', () => {
    mockStatus = 'not-admin'
    renderAt()
    expect(screen.getByRole('alert')).toHaveTextContent(/access denied/i)
    expect(screen.queryByText('secret dashboard')).not.toBeInTheDocument()
  })

  it('renders content for admins', () => {
    mockStatus = 'admin'
    renderAt()
    expect(screen.getByText('secret dashboard')).toBeInTheDocument()
  })
})
