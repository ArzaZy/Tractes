import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'
import { useToast } from '../../hooks/useToast'
import { useQuery } from '../../hooks/useQuery'
import { getSettings, saveSettings, validateSettings, type SettingsInput } from '../../lib/settings'
import { removeImageByUrl } from '../../lib/upload'
import { toAppError } from '../../lib/errors'
import { hasErrors, type FieldErrors } from '../../lib/validation'
import type { SiteSettings, SocialLinks } from '../../types'
import { FormField, ImageField } from '../../components/admin/FormParts'
import { ErrorState, Spinner } from '../../components/States'

const SOCIALS: { key: keyof SocialLinks; label: string }[] = [
  { key: 'github', label: 'GitHub' },
  { key: 'twitter', label: 'X / Twitter' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'website', label: 'Other website' },
]

function toInput(s: SiteSettings): SettingsInput {
  const { id: _id, updated_at: _u, ...rest } = s
  return rest
}

function Editor({ initial }: { initial: SiteSettings }) {
  const toast = useToast()
  const { setSettings } = useSettings()
  const [form, setForm] = useState<SettingsInput>(toInput(initial))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [orphans, setOrphans] = useState<string[]>([])

  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setDirty(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validateSettings(form)
    setErrors(found)
    if (hasErrors(found)) {
      toast.error('Please fix the highlighted fields.')
      return
    }
    setSaving(true)
    try {
      const saved = await saveSettings(form)
      await Promise.allSettled(orphans.map((u) => removeImageByUrl(u)))
      setOrphans([])
      setSettings(saved)
      setForm(toInput(saved))
      setDirty(false)
      toast.success('Settings saved.')
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mx-auto max-w-3xl space-y-6" noValidate>
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Settings</h1>
          {dirty && <p className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</p>}
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          Save settings
        </button>
      </header>

      <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="s-brand">
        <h2 id="s-brand" className="text-base font-semibold text-fg">Brand</h2>
        <FormField label="Site name" htmlFor="s-name" required error={errors.site_name}>
          <input id="s-name" className="field" maxLength={80} value={form.site_name} onChange={(e) => set('site_name', e.target.value)} aria-invalid={Boolean(errors.site_name)} />
        </FormField>
        <FormField label="Tagline" htmlFor="s-tag" error={errors.tagline}>
          <input id="s-tag" className="field" maxLength={160} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
        </FormField>
        <ImageField
          id="s-logo"
          label="Site logo"
          kind="site"
          value={form.logo_url ?? ''}
          error={errors.logo_url}
          onChange={(v) => set('logo_url', v)}
          onReplaced={(u) => setOrphans((o) => [...o, u])}
          previewClass="h-16 w-16"
        />
        <FormField label="Default theme" htmlFor="s-theme" hint="Applied to visitors who have not chosen a theme themselves.">
          <select id="s-theme" className="field" value={form.default_theme} onChange={(e) => set('default_theme', e.target.value as 'dark' | 'light')}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </FormField>
      </section>

      <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="s-contact">
        <h2 id="s-contact" className="text-base font-semibold text-fg">Contact and social</h2>
        <FormField label="Contact email" htmlFor="s-email" error={errors.contact_email} hint="Shown publicly in the footer, About and Privacy pages.">
          <input id="s-email" type="email" className="field" value={form.contact_email ?? ''} onChange={(e) => set('contact_email', e.target.value)} aria-invalid={Boolean(errors.contact_email)} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIALS.map(({ key, label }) => (
            <FormField key={key} label={label} htmlFor={`s-social-${key}`} error={errors[`social.${key}`]}>
              <input
                id={`s-social-${key}`}
                type="url"
                inputMode="url"
                className="field"
                placeholder="https://"
                value={form.social_links[key] ?? ''}
                onChange={(e) => set('social_links', { ...form.social_links, [key]: e.target.value })}
                aria-invalid={Boolean(errors[`social.${key}`])}
              />
            </FormField>
          ))}
        </div>
      </section>

      <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="s-seo">
        <h2 id="s-seo" className="text-base font-semibold text-fg">Default SEO</h2>
        <FormField label="SEO title" htmlFor="s-seo-title" error={errors.seo_title} hint={`${(form.seo_title ?? '').length}/70`}>
          <input id="s-seo-title" className="field" maxLength={70} value={form.seo_title ?? ''} onChange={(e) => set('seo_title', e.target.value)} />
        </FormField>
        <FormField label="SEO description" htmlFor="s-seo-desc" error={errors.seo_description} hint={`${(form.seo_description ?? '').length}/200`}>
          <textarea id="s-seo-desc" rows={3} className="field" maxLength={200} value={form.seo_description ?? ''} onChange={(e) => set('seo_description', e.target.value)} />
        </FormField>
      </section>
    </form>
  )
}

export default function AdminSettings() {
  const { data, loading, error, reload } = useQuery(getSettings, [])
  if (loading) return <Spinner />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data) return null
  return <Editor initial={data} />
}
