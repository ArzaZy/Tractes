export type ChangeKind = 'new' | 'improved' | 'fixed'

export interface Release {
  version: string
  /** ISO date (YYYY-MM-DD) */
  date: string
  title: string
  changes: { kind: ChangeKind; text: string }[]
}

/**
 * Release notes, newest first. To ship a release: add an entry at the top, bump
 * `version` in package.json to match (a test checks they agree), and redeploy.
 */
export const CHANGELOG: Release[] = [
  {
    version: '1.2.0',
    date: '2026-10-25',
    title: 'New look, save, share and schedule',
    changes: [
      { kind: 'new', text: 'New TracLabs logo, drawn as a vector, on a glowing glass tile. The whole site now uses the logo violet in dark and light themes.' },
      { kind: 'new', text: 'Install TracLabs as an app (PWA) with an offline page, plus a new app icon and favicon.' },
      { kind: 'new', text: 'Save projects for later without an account. The list stays in your own browser.' },
      { kind: 'new', text: 'Share card: a glass-style image with logo, name and QR code, ready to post.' },
      { kind: 'new', text: 'Filter Explore by technology, and click any technology on a project page.' },
      { kind: 'new', text: 'Update history on each project, written by the owner.' },
      { kind: 'new', text: 'Admin: schedule a draft to publish itself at a set time.' },
      { kind: 'new', text: 'Admin: link checker that tests project website links from the server.' },
      { kind: 'new', text: 'Admin: privacy-friendly view statistics (daily counts only, no visitor data).' },
      { kind: 'improved', text: 'Home hero has an aurora, a soft grid and a large ghosted logo behind it.' },
      { kind: 'improved', text: 'Smaller, tidier navigation: slimmer top bar, a glass lens that glides to the link you point at, and a more compact mobile dock.' },
      { kind: 'improved', text: 'Project cards have a soft light that follows your cursor.' },
      { kind: 'fixed', text: 'The mobile dock could sink below the bottom of the screen in some mobile browsers. It now stays pinned to the visible area.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-24',
    title: 'Glass dock and a stronger admin',
    changes: [
      { kind: 'new', text: 'Floating liquid-glass dock on phones with a sliding lens. Press and drag across it to switch pages.' },
      { kind: 'new', text: 'Admin login entry on the main site: navbar, dock, footer and menu. Signed-in admins get a Dashboard shortcut instead.' },
      { kind: 'new', text: 'Changelog page and a version badge in the footer and admin sidebar.' },
      { kind: 'new', text: 'Surprise me: jump to a random published project.' },
      { kind: 'new', text: 'Admin preview: open any draft on its public page, with an Edit shortcut. Visitors still cannot see drafts.' },
      { kind: 'new', text: 'Publish-readiness meter on the dashboard, project list and project form.' },
      { kind: 'improved', text: 'Admin dashboard: quick actions, drafts that need attention, and a latest-release card.' },
      { kind: 'improved', text: 'Admin on mobile uses the same glass dock instead of scrolling tabs.' },
      { kind: 'improved', text: 'Project list links straight to the public preview of each project.' },
    ],
  },
  {
    version: '1.0.1',
    date: '2026-10-24',
    title: 'Liquid glass look',
    changes: [
      { kind: 'improved', text: 'New liquid-glass interface: translucent blurred surfaces, specular edges and ambient colour in dark and light themes.' },
      { kind: 'improved', text: 'Solid-surface fallback when the browser lacks backdrop blur or the visitor prefers reduced transparency.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-09',
    title: 'First release',
    changes: [
      { kind: 'new', text: 'Public directory with search, filters, sorting, categories and project pages.' },
      { kind: 'new', text: 'Owner-only admin dashboard for projects, categories and site settings.' },
      { kind: 'new', text: 'Supabase database with Row Level Security, image storage and a Vercel-ready setup.' },
    ],
  },
]

export const APP_VERSION = CHANGELOG[0]!.version
