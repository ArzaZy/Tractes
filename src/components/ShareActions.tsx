import { useState } from 'react'
import { Link2, Loader2, Share2 } from 'lucide-react'
import type { ProjectWithCategory } from '../types'
import { useToast } from '../hooks/useToast'
import { siteOrigin } from '../lib/seo'
import { buildShareCard } from '../lib/shareCard'

/**
 * "Share" builds a card image (name, description, QR) and opens the phone's share
 * sheet with it; where file sharing is unsupported it downloads the PNG instead.
 * The card is an image to post, not a link preview: rich previews in chat apps
 * still depend on server-rendered meta tags (see README, SEO limitations).
 */
export function ShareActions({ project }: { project: ProjectWithCategory }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const url = `${siteOrigin()}/projects/${project.slug}`

  const share = async () => {
    setBusy(true)
    try {
      const blob = await buildShareCard(project, url)
      const file = new File([blob], `${project.slug}-share-card.png`, { type: 'image/png' })
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: project.name, text: project.short_description, url })
      } else {
        const href = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = href
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(href), 10_000)
        toast.success('Share card downloaded.')
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) toast.error('Could not create the share card.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied.')
    } catch {
      toast.error('Could not copy the link.')
    }
  }

  return (
    <>
      <button type="button" onClick={() => void share()} disabled={busy} className="btn btn-secondary">
        {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
        {busy ? 'Making card…' : 'Share'}
      </button>
      <button type="button" onClick={() => void copy()} className="btn btn-secondary h-10 w-10 !p-0" aria-label="Copy link">
        <Link2 className="h-4 w-4" aria-hidden />
      </button>
    </>
  )
}
