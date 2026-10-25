import type { PointerEvent } from 'react'

/** Moves the specular highlight of a `.card-glint` element to the pointer. No re-render needed. */
export function trackGlint(e: PointerEvent<HTMLElement>): void {
  if (e.pointerType === 'touch') return
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}
