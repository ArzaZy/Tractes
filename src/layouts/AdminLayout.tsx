import { Link, NavLink, Outlet } from 'react-router-dom'
import { ExternalLink, FolderKanban, LayoutDashboard, LogOut, Plus, Settings, Sparkles, Tags } from 'lucide-react'
import { LogoTile } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { GlassDock, type DockItem } from '../components/GlassDock'
import { useAuth } from '../hooks/useAuth'
import { useSeo } from '../lib/seo'
import { APP_VERSION } from '../data/changelog'

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

const DOCK: DockItem[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, to: '/admin', match: (p) => p === '/admin' },
  {
    key: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    to: '/admin/projects',
    match: (p) => p.startsWith('/admin/projects') && p !== '/admin/projects/new',
  },
  { key: 'new', label: 'New', icon: Plus, to: '/admin/projects/new', match: (p) => p === '/admin/projects/new' },
  { key: 'categories', label: 'Categories', icon: Tags, to: '/admin/categories', match: (p) => p.startsWith('/admin/categories') },
  { key: 'settings', label: 'Settings', icon: Settings, to: '/admin/settings', match: (p) => p.startsWith('/admin/settings') },
]

export default function AdminLayout() {
  const { session, signOut } = useAuth()
  useSeo({ title: 'Admin', noindex: true })

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="glass-bar hidden border-r md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <LogoTile />
          <span className="font-semibold text-fg">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Admin">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-2 text-fg shadow-[inset_0_1px_0_var(--glass-highlight)] ring-1 ring-accent/30'
                    : 'text-muted hover:bg-surface-2 hover:text-fg'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </NavLink>
          ))}
          <Link
            to="/admin/projects/new"
            className="btn btn-primary mt-3 w-full"
          >
            <Plus className="h-4 w-4" aria-hidden /> New project
          </Link>
        </nav>
        <div className="space-y-2 border-t border-line p-3">
          <Link to="/changelog" className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-muted hover:bg-surface-2 hover:text-fg">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> What's new
            </span>
            <span className="rounded-full border border-line px-2 py-0.5 font-medium">v{APP_VERSION}</span>
          </Link>
          <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm w-full justify-start">
            <ExternalLink className="h-4 w-4" aria-hidden /> View site
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <p className="truncate px-1 text-xs text-muted" title={session?.user.email ?? ''}>
            {session?.user.email}
          </p>
          <button type="button" onClick={() => void signOut()} className="btn btn-secondary btn-sm w-full">
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Mobile header; navigation lives in the glass dock below */}
        <header className="glass-bar sticky top-0 z-30 border-b md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <LogoTile className="h-8 w-8" />
              <span className="font-semibold text-fg">Admin</span>
              <Link to="/changelog" className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">
                v{APP_VERSION}
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button type="button" onClick={() => void signOut()} className="btn btn-ghost h-10 w-10 !p-0" aria-label="Sign out">
                <LogOut className="h-[18px] w-[18px]" aria-hidden />
              </button>
            </div>
          </div>
        </header>

        <div className="hidden h-16 items-center justify-end gap-2 border-b border-line px-6 md:flex">
          <ThemeToggle />
        </div>

        <main className="flex-1 p-4 pb-28 sm:p-6 sm:pb-28 md:pb-8 lg:p-8">
          <Outlet />
        </main>
      </div>

      <GlassDock items={DOCK} label="Admin" />
    </div>
  )
}
