import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { SocialLinkList } from './SocialLinks'
import { useSettings } from '../hooks/useSettings'
import { useAuth } from '../hooks/useAuth'
import { APP_VERSION } from '../data/changelog'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { Download } from 'lucide-react'

export function Footer() {
  const { settings } = useSettings()
  const { status } = useAuth()
  const { canInstall, install } = useInstallPrompt()
  const year = new Date().getFullYear()
  return (
    <footer className="mt-24 glass-bar border-t">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo name={settings.site_name} logoUrl={settings.logo_url} />
          <p className="max-w-xs text-sm text-muted">{settings.tagline}</p>
        </div>

        <nav aria-label="Footer">
          <h2 className="mb-3 text-sm font-semibold text-fg">Navigate</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link className="hover:text-fg" to="/">Home</Link></li>
            <li><Link className="hover:text-fg" to="/explore">Explore</Link></li>
            <li><Link className="hover:text-fg" to="/categories">Categories</Link></li>
            <li><Link className="hover:text-fg" to="/about">About</Link></li>
            <li><Link className="hover:text-fg" to="/saved">Saved</Link></li>
            <li><Link className="hover:text-fg" to="/privacy">Privacy Policy</Link></li>
            <li><Link className="hover:text-fg" to="/changelog">Changelog</Link></li>
            <li><Link className="hover:text-fg" to={status === 'admin' ? '/admin' : '/admin/login'}>{status === 'admin' ? 'Dashboard' : 'Admin login'}</Link></li>
          </ul>
          {canInstall && (
            <button type="button" onClick={() => void install()} className="btn btn-secondary btn-sm mt-4">
              <Download className="h-4 w-4" aria-hidden /> Install app
            </button>
          )}
        </nav>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-fg">Connect</h2>
          <SocialLinkList links={settings.social_links} email={settings.contact_email} />
          {Object.keys(settings.social_links).length === 0 && !settings.contact_email && (
            <p className="text-sm text-muted">Contact links will appear here once added by the owner.</p>
          )}
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">
        © {year} {settings.site_name}. All rights reserved. ·{' '}
        <Link to="/changelog" className="font-medium hover:text-fg" aria-label={`Version ${APP_VERSION}, view changelog`}>
          v{APP_VERSION}
        </Link>
      </div>
    </footer>
  )
}
