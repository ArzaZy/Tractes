import { useSettings } from '../hooks/useSettings'
import { useSeo } from '../lib/seo'

export default function Privacy() {
  const { settings } = useSettings()
  useSeo({ title: 'Privacy Policy', path: '/privacy', description: 'How this site handles your data.' }, settings.site_name)

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted">
        This is a plain-language template. The site owner should review it and adapt it to their situation and local law before
        relying on it.
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-fg">What we collect</h2>
          <p>
            Browsing the public directory does not require an account and this site does not ask visitors for personal
            information. Search terms you type are sent to our database to return matching projects.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-fg">What is stored in your browser</h2>
          <p>
            Your light/dark theme choice and the list of projects you save are kept in your browser's local storage, only on your
            device. We never receive that list. No tracking cookies are set by this site's own code.
          </p>
          <p className="mt-2">
            When you open a project page we add one to a daily view counter for that project. The counter stores a project and a
            date only: no IP address, no identifier, and nothing that links a view to you.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-fg">Hosting and infrastructure</h2>
          <p>
            The site is served by Vercel and its data is stored with Supabase. These providers may process technical data such as
            IP addresses and request logs to operate their services, under their own policies.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-fg">External links</h2>
          <p>
            Project pages link to external websites. We are not responsible for the content or privacy practices of those sites.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-fg">Contact</h2>
          <p>
            {settings.contact_email ? (
              <>
                Questions about this policy can be sent to{' '}
                <a className="text-accent hover:underline" href={`mailto:${settings.contact_email}`}>
                  {settings.contact_email}
                </a>
                .
              </>
            ) : (
              'The owner can add a contact email in the admin settings.'
            )}
          </p>
        </section>
      </div>
    </div>
  )
}
