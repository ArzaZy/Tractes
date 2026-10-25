import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, LogIn, Menu, Search, X } from 'lucide-react'
import { Logo } from './Logo'
import { NavLens } from './NavLens'
import { useSaved } from '../hooks/useSaved'
import { ThemeToggle } from './ThemeToggle'
import { useSettings } from '../hooks/useSettings'
import { useAuth } from '../hooks/useAuth'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About' },
]


export function Navbar({ onSearch }: { onSearch: () => void }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { settings } = useSettings()
  const { status } = useAuth()
  const { count: savedCount } = useSaved()
  const isAdmin = status === 'admin'
  const location = useLocation()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled ? 'glass-bar' : 'glass-bar glass-bar-top'
      }`}
    >
      <div className="container-page flex h-14 items-center justify-between gap-3">
        <Logo name={settings.site_name} logoUrl={settings.logo_url} />

        <NavLens items={[...LINKS, { to: '/saved', label: 'Saved', badge: savedCount }]} />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSearch}
            className="btn btn-secondary h-9 !min-h-0 gap-2 !px-2.5 text-xs text-muted"
            aria-label="Search projects"
            aria-keyshortcuts="Control+K Meta+K"
          >
            <Search className="h-4 w-4" aria-hidden />
            <span className="hidden text-sm sm:inline">Search</span>
            <kbd className="hidden rounded border border-line px-1.5 text-[11px] text-muted lg:inline">Ctrl K</kbd>
          </button>
          <Link
            to={isAdmin ? '/admin' : '/admin/login'}
            className="btn btn-secondary hidden h-9 !min-h-0 !px-2.5 text-xs md:inline-flex"
          >
            {isAdmin ? <LayoutDashboard className="h-4 w-4" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
            {isAdmin ? 'Dashboard' : 'Admin login'}
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn btn-ghost h-9 !min-h-0 w-9 !p-0 md:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-drawer"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

    </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-2 glass-strong rounded-l-3xl p-4 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-muted">Menu</span>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="btn btn-ghost h-10 w-10 !p-0" aria-label="Close menu">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {[...LINKS, { to: '/saved', label: savedCount ? `Saved (${savedCount})` : 'Saved', end: false }].map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 text-base font-medium ${isActive ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'}`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <Link to={isAdmin ? '/admin' : '/admin/login'} className="btn btn-secondary mt-auto w-full">
              {isAdmin ? <LayoutDashboard className="h-4 w-4" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
              {isAdmin ? 'Dashboard' : 'Admin login'}
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
