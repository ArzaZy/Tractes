import {
  Boxes,
  CheckSquare,
  Clapperboard,
  Code2,
  Folder,
  Gamepad2,
  Globe,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/** Whitelisted icon names; the admin picks from this list so nothing arbitrary is rendered. */
export const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Code2,
  CheckSquare,
  Clapperboard,
  Globe,
  Gamepad2,
  Wrench,
  Boxes,
  Folder,
}

export const ICON_NAMES = Object.keys(ICONS)

export function CategoryIcon({ name, className = 'h-5 w-5' }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Folder
  return <Icon className={className} aria-hidden />
}
