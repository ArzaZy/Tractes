import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Compass, House, Search } from 'lucide-react'
import { GlassDock, cellIndexAt, type DockItem } from './GlassDock'

describe('cellIndexAt', () => {
  it('maps x positions to cells and clamps at the edges', () => {
    expect(cellIndexAt(10, 0, 500, 5)).toBe(0)
    expect(cellIndexAt(250, 0, 500, 5)).toBe(2)
    expect(cellIndexAt(499, 0, 500, 5)).toBe(4)
    expect(cellIndexAt(-40, 0, 500, 5)).toBe(0)
    expect(cellIndexAt(900, 0, 500, 5)).toBe(4)
  })
})

function setup(path = '/explore', onSearch = vi.fn()) {
  const items: DockItem[] = [
    { key: 'home', label: 'Home', icon: House, to: '/', match: (p) => p === '/' },
    { key: 'explore', label: 'Explore', icon: Compass, to: '/explore', match: (p) => p.startsWith('/explore') },
    { key: 'search', label: 'Search', icon: Search, onSelect: onSearch },
  ]
  render(
    <MemoryRouter initialEntries={[path]}>
      <GlassDock items={items} label="Primary" />
      <Routes>
        <Route path="/" element={<p>home page</p>} />
        <Route path="/explore" element={<p>explore page</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return { onSearch }
}

describe('GlassDock', () => {
  it('marks the current route as active', () => {
    setup('/explore')
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('navigates when a link is tapped', async () => {
    setup('/explore')
    await userEvent.click(screen.getByRole('link', { name: 'Home' }))
    expect(await screen.findByText('home page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })

  it('runs an action item instead of navigating', async () => {
    const { onSearch } = setup('/explore')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(screen.getByText('explore page')).toBeInTheDocument()
  })

  it('is exposed as a labelled navigation landmark', () => {
    setup()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })
})
