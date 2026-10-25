import { toAppError, withTimeout } from './errors'
import { getClient } from './supabase'

export interface ViewRow {
  project_id: string
  day: string
  views: number
}

export interface ViewStats {
  /** Views in the whole window (default 30 days). */
  total: number
  today: number
  /** Last `chartDays` days, oldest first, zero-filled. */
  daily: { day: string; views: number }[]
  top: { project_id: string; name: string; slug: string; views: number }[]
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

/** Pure aggregation, so it can be tested without a database. Days are UTC. */
export function aggregateViews(
  rows: ViewRow[],
  projects: { id: string; name: string; slug: string }[],
  today: Date = new Date(),
  windowDays = 30,
  chartDays = 14,
): ViewStats {
  const todayKey = dayKey(today)
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - (windowDays - 1))
  const startKey = dayKey(start)

  const perDay = new Map<string, number>()
  const perProject = new Map<string, number>()
  let total = 0
  for (const r of rows) {
    if (r.day < startKey || r.day > todayKey) continue
    total += r.views
    perDay.set(r.day, (perDay.get(r.day) ?? 0) + r.views)
    perProject.set(r.project_id, (perProject.get(r.project_id) ?? 0) + r.views)
  }

  const daily: ViewStats['daily'] = []
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const k = dayKey(d)
    daily.push({ day: k, views: perDay.get(k) ?? 0 })
  }

  const byId = new Map(projects.map((p) => [p.id, p]))
  const top = [...perProject.entries()]
    .flatMap(([id, views]) => {
      const p = byId.get(id)
      return p ? [{ project_id: id, name: p.name, slug: p.slug, views }] : []
    })
    .sort((a, b) => b.views - a.views || a.name.localeCompare(b.name))
    .slice(0, 5)

  return { total, today: perDay.get(todayKey) ?? 0, daily, top }
}

export async function getViewStats(): Promise<ViewStats> {
  try {
    const client = getClient()
    const since = new Date()
    since.setUTCDate(since.getUTCDate() - 29)
    const [views, projects] = await Promise.all([
      withTimeout(client.from('project_view_counts').select('project_id,day,views').gte('day', dayKey(since)).limit(5000)),
      withTimeout(client.from('projects').select('id,name,slug')),
    ])
    if (views.error) throw views.error
    if (projects.error) throw projects.error
    return aggregateViews((views.data ?? []) as ViewRow[], (projects.data ?? []) as { id: string; name: string; slug: string }[])
  } catch (e) {
    throw toAppError(e)
  }
}

// ---- Recording (visitor side) -------------------------------------------------------------

const SESSION_KEY = 'traclabs-viewed'

/** True the first time a slug is seen in this browser session. Counts one view per project per visit. */
export function shouldRecordView(slug: string, storage: Pick<Storage, 'getItem' | 'setItem'> | null): boolean {
  if (!storage) return true
  try {
    const seen: unknown = JSON.parse(storage.getItem(SESSION_KEY) ?? '[]')
    const list = Array.isArray(seen) ? seen.filter((s): s is string => typeof s === 'string') : []
    if (list.includes(slug)) return false
    storage.setItem(SESSION_KEY, JSON.stringify([...list, slug].slice(-200)))
    return true
  } catch {
    return true
  }
}

/** Fire-and-forget. Failures are ignored: analytics must never affect the page. */
export async function recordViewOnce(slug: string): Promise<void> {
  let storage: Storage | null = null
  try {
    storage = window.sessionStorage
  } catch {
    storage = null
  }
  if (!shouldRecordView(slug, storage)) return
  try {
    await getClient().rpc('record_project_view', { p_slug: slug })
  } catch {
    /* ignore */
  }
}
