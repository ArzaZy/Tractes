import { Link } from 'react-router-dom'
import { Compass, Layers, Target } from 'lucide-react'
import { useSettings } from '../hooks/useSettings'
import { useSeo } from '../lib/seo'
import { SocialLinkList } from '../components/SocialLinks'

export default function About() {
  const { settings } = useSettings()
  useSeo(
    { title: 'About', path: '/about', description: 'TracLabs is a central directory for the digital projects built by its owner.' },
    settings.site_name,
  )

  const hasContact = Object.keys(settings.social_links).length > 0 || Boolean(settings.contact_email)

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">About {settings.site_name}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        {settings.site_name} is a central directory for the websites, tools, and digital projects built by its owner. Instead of
        scattered links, everything lives in one place that is easy to browse and search.
      </p>

      <div className="mt-10 grid gap-4">
        <section className="card flex gap-4 p-5" aria-labelledby="mission">
          <Target className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden />
          <div>
            <h2 id="mission" className="text-lg font-semibold text-fg">
              Mission
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Make useful digital tools easy to find, understand, and try, with honest descriptions of what each project is and
              how far along it is.
            </p>
          </div>
        </section>

        <section className="card flex gap-4 p-5" aria-labelledby="discover">
          <Compass className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden />
          <div>
            <h2 id="discover" className="text-lg font-semibold text-fg">
              What you can discover
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Browse published projects by <Link className="text-accent hover:underline" to="/categories">category</Link>, search the{' '}
              <Link className="text-accent hover:underline" to="/explore">full directory</Link>, and open each project's page for
              features, technologies, and a link to visit it.
            </p>
          </div>
        </section>

        <section className="card flex gap-4 p-5" aria-labelledby="status">
          <Layers className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden />
          <div>
            <h2 id="status" className="text-lg font-semibold text-fg">
              Project status
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Every project is labelled In Development, Beta, Live, or Archived so you always know what to expect.
            </p>
          </div>
        </section>
      </div>

      {hasContact && (
        <section className="mt-10" aria-labelledby="contact">
          <h2 id="contact" className="mb-3 text-lg font-semibold text-fg">
            Get in touch
          </h2>
          <SocialLinkList links={settings.social_links} email={settings.contact_email} />
        </section>
      )}
    </div>
  )
}
