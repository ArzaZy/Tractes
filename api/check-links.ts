import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { checkUrl, type LinkResult } from './_lib/linkCheck.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_IDS = 10
const CONCURRENCY = 5

/**
 * POST /api/check-links  { ids: string[] }  with  Authorization: Bearer <supabase access token>
 *
 * The caller is verified as an admin by asking the database (public.is_admin()) with the
 * caller's own token, so no service-role key exists or is needed here.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'The server is not configured.' })

  const header = req.headers.authorization
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return res.status(401).json({ error: 'Sign in required.' })

  const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as { ids?: unknown }
  const ids = Array.isArray(body.ids) ? body.ids : null
  if (!ids || ids.length === 0 || ids.length > MAX_IDS || !ids.every((i): i is string => typeof i === 'string' && UUID.test(i))) {
    return res.status(400).json({ error: `Send between 1 and ${MAX_IDS} project ids.` })
  }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: isAdmin, error: authError } = await supabase.rpc('is_admin')
  if (authError) return res.status(401).json({ error: 'Your session is not valid. Please sign in again.' })
  if (isAdmin !== true) return res.status(403).json({ error: 'Admins only.' })

  const { data: rows, error } = await supabase.from('projects').select('id,website_url').in('id', ids)
  if (error) return res.status(500).json({ error: 'Could not load projects.' })

  const results: Record<string, LinkResult> = {}
  const queue = (rows ?? []).filter((r) => r.website_url) as { id: string; website_url: string }[]

  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      results[next.id] = await checkUrl(next.website_url)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))

  return res.status(200).json({ results })
}
