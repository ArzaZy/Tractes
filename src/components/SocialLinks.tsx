import { ExternalLink, Mail } from 'lucide-react'
import type { SocialLinks as Links } from '../types'
import { safeUrlOrNull } from '../lib/validation'

const LABELS: Record<keyof Links, string> = {
  github: 'GitHub',
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  youtube: 'YouTube',
  website: 'Website',
}

/** Renders only links that pass URL validation; renders nothing when none are configured. */
export function SocialLinkList({ links, email, className = '' }: { links: Links; email?: string | null; className?: string }) {
  const entries = (Object.keys(LABELS) as (keyof Links)[])
    .map((k) => [k, safeUrlOrNull(links[k])] as const)
    .filter((e): e is readonly [keyof Links, string] => e[1] !== null)

  if (entries.length === 0 && !email) return null

  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {email && (
        <li>
          <a href={`mailto:${email}`} className="btn btn-secondary btn-sm">
            <Mail className="h-3.5 w-3.5" aria-hidden /> {email}
          </a>
        </li>
      )}
      {entries.map(([k, url]) => (
        <li key={k}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            {LABELS[k]} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
