import { useState, type ReactNode } from 'react'
import { safeUrlOrNull } from '../lib/validation'

interface Props {
  src: string | null | undefined
  alt: string
  className?: string
  fallback: ReactNode
  width?: number
  height?: number
  priority?: boolean
}

/** Lazy image that falls back when missing, unsafe or broken. */
export function SafeImage({ src, alt, className, fallback, width, height, priority }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const safe = safeUrlOrNull(src)
  if (!safe || failedSrc === safe) return <>{fallback}</>
  return (
    <img
      src={safe}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(safe)}
      className={className}
    />
  )
}
