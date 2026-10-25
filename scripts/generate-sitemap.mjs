// Post-build step: writes dist/sitemap.xml (static routes + published projects and
// categories) and appends the Sitemap line to dist/robots.txt.
// Uses only the PUBLIC anon key, so it can only ever see what visitors can see.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const dist = new URL('../dist/', import.meta.url)

const siteUrl = (
  process.env.VITE_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/+$/, '')

if (!siteUrl) {
  console.warn('[sitemap] VITE_SITE_URL is not set; skipping sitemap generation. Set it to your production URL.')
  process.exit(0)
}

const base = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

async function fetchRows(path) {
  const res = await fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const urls = ['/', '/explore', '/categories', '/about', '/privacy', '/changelog'].map((p) => ({ loc: p }))

if (base && key) {
  try {
    const [projects, categories] = await Promise.all([
      fetchRows('projects?select=slug,updated_at&publication_state=eq.published'),
      fetchRows('categories?select=slug'),
    ])
    for (const c of categories) urls.push({ loc: `/categories/${c.slug}` })
    for (const p of projects) urls.push({ loc: `/projects/${p.slug}`, lastmod: p.updated_at?.slice(0, 10) })
  } catch (e) {
    console.warn(`[sitemap] Could not load dynamic URLs (${e.message}); writing static routes only.`)
  }
} else {
  console.warn('[sitemap] Supabase env vars missing; writing static routes only.')
}

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls
    .map((u) => `  <url><loc>${esc(siteUrl + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n') +
  `\n</urlset>\n`

writeFileSync(new URL('sitemap.xml', dist), xml)

const robotsPath = new URL('robots.txt', dist)
const robots = existsSync(robotsPath) ? readFileSync(robotsPath, 'utf8') : 'User-agent: *\nAllow: /\n'
if (!/^Sitemap:/im.test(robots)) writeFileSync(robotsPath, `${robots.trimEnd()}\nSitemap: ${siteUrl}/sitemap.xml\n`)

console.log(`[sitemap] wrote ${urls.length} URLs to dist/sitemap.xml`)
