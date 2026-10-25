import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

export interface DockItem {
  key: string
  label: string
  icon: LucideIcon
  /** Route to open. Rendered as a real link so keyboard / middle-click still work. */
  to?: string
  /** Action instead of a route (e.g. open search). */
  onSelect?: () => void
  /** Decides whether this item is the active one for the current path. Defaults to an exact match on `to`. */
  match?: (pathname: string) => boolean
}

const DRAG_THRESHOLD = 6

/** Index of the cell under a pointer x-position, clamped to the dock. */
export function cellIndexAt(x: number, left: number, width: number, count: number): number {
  const cell = width / count
  return Math.min(count - 1, Math.max(0, Math.floor((x - left) / cell)))
}

/**
 * Floating liquid-glass tab bar for phones. A glass "lens" slides to the active
 * item with a springy overshoot. Press and drag across the bar (like iOS) to move
 * the lens; releasing selects the item under it.
 */
export function GlassDock({ items, label, className = '' }: { items: DockItem[]; label: string; className?: string }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const gridRef = useRef<HTMLDivElement>(null)
  const suppressClick = useRef(false)
  const stopListening = useRef<(() => void) | null>(null)

  const [pressed, setPressed] = useState(false)
  const [dragPx, setDragPx] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  const activeIndex = items.findIndex((i) => (i.match ? i.match(pathname) : i.to === pathname))
  const n = items.length

  useEffect(() => () => stopListening.current?.(), [])

  const activate = (idx: number) => {
    const item = items[idx]
    if (!item) return
    if (item.onSelect) item.onSelect()
    else if (item.to && item.to !== pathname) navigate(item.to)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const grid = gridRef.current
    if (!grid) return
    const rect = grid.getBoundingClientRect()
    const cell = rect.width / n
    const startX = e.clientX
    let moved = false
    let last = cellIndexAt(e.clientX, rect.left, rect.width, n)
    setPressed(true)

    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - startX) < DRAG_THRESHOLD) return
      moved = true
      const x = ev.clientX - rect.left
      setDragPx(Math.min(rect.width - cell, Math.max(0, x - cell / 2)))
      const idx = cellIndexAt(ev.clientX, rect.left, rect.width, n)
      if (idx !== last) {
        last = idx
        setHover(idx)
        try {
          navigator.vibrate?.(6)
        } catch {
          /* haptics unavailable */
        }
      }
    }

    const finish = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      stopListening.current = null
      setPressed(false)
      setDragPx(null)
      setHover(null)
    }
    const onUp = (ev: PointerEvent) => {
      finish()
      if (moved) {
        // The browser still fires a click on release; swallow it, we navigate ourselves.
        suppressClick.current = true
        setTimeout(() => (suppressClick.current = false), 60)
        activate(cellIndexAt(ev.clientX, rect.left, rect.width, n))
      }
    }
    const onCancel = () => finish()

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    stopListening.current = finish
  }

  const onClickCapture = (e: MouseEvent) => {
    if (suppressClick.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const lensVisible = activeIndex >= 0 || dragPx !== null
  const transform = dragPx !== null ? `translateX(${dragPx}px)` : `translateX(${Math.max(activeIndex, 0) * 100}%)`
  const highlighted = hover ?? activeIndex

  return (
    // The wrapper is sticky (not fixed): sticky follows the *visible* area, so mobile browsers whose
    // toolbars resize the viewport cannot push the dock below the screen edge.
    <div className="dock-wrap md:hidden">
    <nav aria-label={label} className={`dock glass ${className}`} onClickCapture={onClickCapture}>
      <div
        ref={gridRef}
        onPointerDown={onPointerDown}
        className="relative grid"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden="true"
          className={`dock-lens ${pressed ? 'is-pressed' : ''} ${dragPx !== null ? 'is-dragging' : ''}`}
          style={{ width: `${100 / n}%`, transform, opacity: lensVisible ? 1 : 0 }}
        >
          <span />
        </span>

        {items.map((item, i) => {
          const on = i === highlighted
          const Icon = item.icon
          const cls = `dock-item ${on ? 'is-on' : ''}`
          const inner = (
            <>
              <Icon className="h-[19px] w-[19px]" aria-hidden />
              <span>{item.label}</span>
            </>
          )
          return item.to && !item.onSelect ? (
            <Link key={item.key} to={item.to} className={cls} aria-current={i === activeIndex ? 'page' : undefined} draggable={false}>
              {inner}
            </Link>
          ) : (
            <button key={item.key} type="button" className={cls} onClick={item.onSelect}>
              {inner}
            </button>
          )
        })}
      </div>
    </nav>
    </div>
  )
}
