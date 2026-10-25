import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { isPrivateIp } from './ip.js'

export type LinkState = 'ok' | 'redirect' | 'broken' | 'blocked' | 'error'

export interface LinkResult {
  state: LinkState
  httpStatus?: number
  finalUrl?: string
  message?: string
}

const MAX_REDIRECTS = 3

async function hostIsPublic(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, '')
  if (isIP(host)) return !isPrivateIp(host)
  const addrs = await lookup(host, { all: true })
  return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address))
}

/**
 * Checks that a URL answers. Only http(s) to public addresses is allowed, every
 * redirect hop is re-validated, and the whole check has one deadline.
 * Limitation: DNS is resolved once for validation and again by fetch, so a
 * hostile DNS server could still rebind; only the admin's own URLs are checked.
 */
export async function checkUrl(input: string, timeoutMs = 3000): Promise<LinkResult> {
  const deadline = Date.now() + timeoutMs
  let current = input

  for (let hop = 0; ; hop++) {
    let url: URL
    try {
      url = new URL(current)
    } catch {
      return { state: 'blocked', message: 'Not a valid URL' }
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { state: 'blocked', message: 'Only http(s) links are checked' }
    }

    try {
      if (!(await hostIsPublic(url.hostname))) {
        return { state: 'blocked', message: 'Points to a private or internal address' }
      }
    } catch {
      return { state: 'broken', message: 'Domain could not be resolved' }
    }

    const remaining = deadline - Date.now()
    if (remaining <= 0) return { state: 'error', message: 'Timed out' }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), remaining)
    let res: Response
    try {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': 'TracLabs-LinkCheck/1.0', range: 'bytes=0-0' },
      })
    } catch {
      return { state: 'error', message: controller.signal.aborted ? 'Timed out' : 'Could not connect' }
    } finally {
      clearTimeout(timer)
    }
    // We only need the status line; do not download the body.
    void res.body?.cancel().catch(() => undefined)

    const status = res.status
    const location = res.headers.get('location')
    if (status >= 300 && status < 400 && location) {
      if (hop >= MAX_REDIRECTS) return { state: 'broken', httpStatus: status, message: 'Too many redirects' }
      current = new URL(location, url).toString()
      continue
    }

    const finalUrl = hop > 0 ? url.toString() : undefined
    if (status >= 200 && status < 300) return { state: hop > 0 ? 'redirect' : 'ok', httpStatus: status, finalUrl }
    // The server answered but refuses automated visitors: the link works for people.
    if (status === 401 || status === 403 || status === 429) {
      return { state: hop > 0 ? 'redirect' : 'ok', httpStatus: status, finalUrl, message: 'Reachable, but restricts automated checks' }
    }
    return { state: 'broken', httpStatus: status, finalUrl, message: `HTTP ${status}` }
  }
}
