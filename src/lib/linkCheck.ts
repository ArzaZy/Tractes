import { AppError, messageFor } from './errors'

export type LinkState = 'ok' | 'redirect' | 'broken' | 'blocked' | 'error'

export interface LinkResult {
  state: LinkState
  httpStatus?: number
  finalUrl?: string
  message?: string
}

/**
 * Asks the server (/api/check-links) to test the given projects' website URLs.
 * The server verifies the admin token itself; the browser cannot probe other sites directly.
 */
export async function checkLinks(ids: string[], accessToken: string): Promise<Record<string, LinkResult>> {
  if (ids.length === 0) return {}
  let res: Response
  try {
    res = await fetch('/api/check-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ ids: ids.slice(0, 10) }),
    })
  } catch {
    throw new AppError('network', messageFor('network'))
  }
  if (res.status === 404) {
    throw new AppError('not_found', 'The link checker is only available on the deployed site (or with `vercel dev`).')
  }
  if (res.status === 401) throw new AppError('auth', messageFor('auth'))
  if (res.status === 403) throw new AppError('permission', messageFor('permission'))
  if (!res.ok) throw new AppError('unknown', 'The link check failed. Please try again.')
  const json = (await res.json().catch(() => null)) as { results?: Record<string, LinkResult> } | null
  return json?.results ?? {}
}
