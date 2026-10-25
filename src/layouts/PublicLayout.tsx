import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Compass, House, LayoutDashboard, LayoutGrid, LogIn, Search } from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { SearchOverlay } from '../components/SearchOverlay'
import { GlassDock, type DockItem } from '../components/GlassDock'
import { useAuth } from '../hooks/useAuth'

export function PublicLayout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const { pathname } = useLocation()
  const { status } = useAuth()
  const isAdmin = status === 'admin'

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const dock = useMemo<DockItem[]>(
    () => [
      { key: 'home', label: 'Home', icon: House, to: '/', match: (p) => p === '/' },
      { key: 'explore', label: 'Explore', icon: Compass, to: '/explore', match: (p) => p.startsWith('/explore') || p.startsWith('/projects') },
      { key: 'search', label: 'Search', icon: Search, onSelect: () => setSearchOpen(true) },
      { key: 'categories', label: 'Categories', icon: LayoutGrid, to: '/categories', match: (p) => p.startsWith('/categories') },
      isAdmin
        ? { key: 'admin', label: 'Dashboard', icon: LayoutDashboard, to: '/admin', match: () => false }
        : { key: 'login', label: 'Login', icon: LogIn, to: '/admin/login', match: () => false },
    ],
    [isAdmin],
  )

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-accent-strong focus:px-4 focus:py-2 focus:text-accent-fg"
      >
        Skip to content
      </a>
      <Navbar onSearch={() => setSearchOpen(true)} />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <div className="h-20 md:hidden" aria-hidden="true" />
      <GlassDock items={dock} label="Primary" />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
