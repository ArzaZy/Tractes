import { Link } from 'react-router-dom'

/**
 * The TracLabs mark: a "T" and an "L" cut from one slanted block, plus a spark.
 * Traced from the brand artwork as vector paths so it stays sharp at any size and
 * follows the theme (the white stem becomes dark in the light theme).
 */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="40 37 927 696" className={className} aria-hidden="true" focusable="false">
      <polygon points="195,47 817,47 675,187 50,187" fill="var(--mark-a)" />
      <polygon points="420,187 447,187 447,497 263,660 263,347" fill="var(--mark-b)" />
      <polygon points="632,318 632,582 932,582 790,723 478,723 478,462" fill="var(--mark-a)" />
      <polygon points="853,195 868,285 957,300 868,315 853,408 838,315 750,300 838,285" fill="var(--mark-a)" />
    </svg>
  )
}

/** The mark on a glass tile with a violet glow and a faint grid, so it reads on any page. */
export function LogoTile({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <span className={`logo-tile ${className}`} aria-hidden="true">
      <LogoMark className="h-full w-full" />
    </span>
  )
}

export function Logo({ name = 'TracLabs', logoUrl }: { name?: string; logoUrl?: string | null }) {
  const head = name.length > 4 && name.toLowerCase().endsWith('labs') ? name.slice(0, -4) : name
  const tail = name.length > 4 && name.toLowerCase().endsWith('labs') ? name.slice(-4) : ''
  return (
    <Link to="/" className="inline-flex items-center gap-2 rounded-lg" aria-label={`${name} home`}>
      {logoUrl ? (
        <img src={logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" width={32} height={32} />
      ) : (
        <LogoTile />
      )}
      <span className="text-base font-bold tracking-tight text-fg">
        {head}
        {tail && <span className="text-accent">{tail}</span>}
      </span>
    </Link>
  )
}
