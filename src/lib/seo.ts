import { useEffect } from 'react'

export interface SeoOptions {
  title?: string
  description?: string
  /** Path beginning with "/", used to build the canonical URL. */
  path?: string
  image?: string | null
  noindex?: boolean
}

const SITE_NAME_FALLBACK = 'TracLabs'

export function siteOrigin(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, '')
  return configured || window.location.origin
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function applySeo(opts: SeoOptions, siteName = SITE_NAME_FALLBACK, defaultDescription = ''): void {
  const title = opts.title ? `${opts.title} · ${siteName}` : siteName
  const description = opts.description || defaultDescription
  document.title = title

  if (description) {
    setMeta('name', 'description', description)
    setMeta('property', 'og:description', description)
  }
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:site_name', siteName)
  setMeta('property', 'og:type', 'website')
  setMeta('name', 'twitter:card', opts.image ? 'summary_large_image' : 'summary')
  if (opts.image) setMeta('property', 'og:image', opts.image)

  if (opts.path) {
    const url = `${siteOrigin()}${opts.path}`
    setCanonical(url)
    setMeta('property', 'og:url', url)
  }
  setMeta('name', 'robots', opts.noindex ? 'noindex, nofollow' : 'index, follow')
}

/** Per-page title/description/Open Graph/canonical. */
export function useSeo(opts: SeoOptions, siteName?: string, defaultDescription?: string): void {
  const { title, description, path, image, noindex } = opts
  useEffect(() => {
    applySeo({ title, description, path, image, noindex }, siteName, defaultDescription)
  }, [title, description, path, image, noindex, siteName, defaultDescription])
}
