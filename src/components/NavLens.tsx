import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

export interface NavLensItem {
  to: string
  label: string
  end?: boolean
  badge?: number
  /** Extra paths that should count as "active" for the lens. */
  match?: (pathname: string) => boolean
}

/**
 * Desktop navigation with a glass lens that glides to the hovered / focused / active
 * link, the same motion language as the mobile dock.
 */
export function NavLens({ items, label = 'Main' }: { items: NavLensItem[]; label?: string }) {
  const { pathname } = useLocation()
  const wrapRef = useRef<HTMLDivElement>(null)
  const refs = useRef(new Map<string, HTMLAnchorElement>())
  const [hover, setHover] = useState<string | null>(null)
  const [box, setBox] = useState<{ x: number; w: number } | null>(null)
  const [ready, setReady] = useState(false)

  const active =
    items.find((i) => (i.match ? i.match(pathname) : i.end ? pathname === i.to : pathname === i.to || pathname.startsWith(`${i.to}/`)))?.to ??
    null
  const target = hover ?? active
  const badgeKey = items.map((i) => i.badge ?? 0).join(',')

  const measure = useCallback(() => {
    const el = target ? refs.current.get(target) : undefined
    setBox(el ? { x: el.offsetLeft, w: el.offsetWidth } : null)
  }, [target])

  useLayoutEffect(() => {
    measure()
  }, [measure, badgeKey])

  // Enable the glide only after the first position is set, so it does not fly in from the left.
  useEffect(() => setReady(true), [])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !wrapRef.current) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [measure])

  return (
    <nav aria-label={label} className="hidden md:block">
      <div ref={wrapRef} className="relative flex items-center gap-1" onPointerLeave={() => setHover(null)}>
        <span
          aria-hidden="true"
          className={`nav-lens ${ready ? 'is-ready' : ''}`}
          style={{ width: box?.w ?? 0, transform: `translateX(${box?.x ?? 0}px)`, opacity: box ? 1 : 0 }}
        >
          <span />
        </span>
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            ref={(el) => {
              if (el) refs.current.set(i.to, el)
              else refs.current.delete(i.to)
            }}
            onPointerEnter={() => setHover(i.to)}
            onFocus={() => setHover(i.to)}
            onBlur={() => setHover(null)}
            className={`relative z-10 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
              target === i.to ? 'text-fg' : 'text-muted'
            }`}
          >
            {i.label}
            {i.badge ? (
              <span className="rounded-full bg-violet/20 px-1.5 text-[11px] font-semibold leading-5 text-violet">
                {i.badge}
                <span className="sr-only"> saved</span>
              </span>
            ) : null}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
