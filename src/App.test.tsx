import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// No Supabase credentials in tests: nothing may hit the network.
vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: false,
  getClient: () => {
    throw new Error('Supabase is not configured in tests')
  },
}))

import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { SettingsProvider } from './hooks/useSettings'
import { ThemeProvider } from './hooks/useTheme'
import { ToastProvider } from './hooks/useToast'

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <SettingsProvider>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </SettingsProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('routing', () => {
  it('shows the custom 404 page for unknown routes', async () => {
    renderApp('/definitely/not/a/page')
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })

  it('redirects unauthenticated visitors from /admin to the login page', async () => {
    renderApp('/admin/projects')
    expect(await screen.findByRole('heading', { name: /admin sign in/i })).toBeInTheDocument()
  })

  it('renders the homepage hero without a database', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: /explore what we've built/i })).toBeInTheDocument()
    expect(screen.getByText('THE DIGITAL PROJECT HUB')).toBeInTheDocument()
  })
})
