import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Loader2, Save, Send, Undo2 } from 'lucide-react'
import { useQuery } from '../../hooks/useQuery'
import { useToast } from '../../hooks/useToast'
import { createProject, getProjectById, isSlugTaken, updateProject } from '../../lib/projects'
import { listCategoriesForAdmin } from '../../lib/categories'
import { removeImageByUrl } from '../../lib/upload'
import { AppError, toAppError } from '../../lib/errors'
import { LIMITS, hasErrors, isValidSlug, slugify, validateProjectInput, type FieldErrors } from '../../lib/validation'
import { PROJECT_STATUSES, type ProjectInput, type ProjectWithCategory, type SocialLinks } from '../../types'
import { STATUS_LABELS } from '../../lib/utils'
import { FormField, ImageField, ListInput, Toggle } from '../../components/admin/FormParts'
import { ErrorState, Spinner } from '../../components/States'
import { PublicationBadge } from '../../components/StatusBadge'
import { CompletenessCard } from '../../components/admin/Completeness'
import { UpdatesManager } from '../../components/admin/UpdatesManager'
import { toLocalInput } from '../../lib/schedule'

const EMPTY: ProjectInput = {
  name: '',
  slug: '',
  short_description: '',
  description: '',
  website_url: '',
  logo_url: '',
  thumbnail_url: '',
  category_id: '',
  status: 'development',
  publication_state: 'draft',
  is_featured: false,
  features: [],
  technologies: [],
  documentation_url: '',
  source_code_url: '',
  social_links: {},
  publish_at: '',
}

function toInput(p: ProjectWithCategory): ProjectInput {
  return {
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    description: p.description ?? '',
    website_url: p.website_url ?? '',
    logo_url: p.logo_url ?? '',
    thumbnail_url: p.thumbnail_url ?? '',
    category_id: p.category_id ?? '',
    status: p.status,
    publication_state: p.publication_state,
    is_featured: p.is_featured,
    features: p.features,
    technologies: p.technologies,
    documentation_url: p.documentation_url ?? '',
    source_code_url: p.source_code_url ?? '',
    social_links: p.social_links,
    publish_at: toLocalInput(p.publish_at),
  }
}

const SOCIALS: { key: keyof SocialLinks; label: string }[] = [
  { key: 'github', label: 'GitHub' },
  { key: 'twitter', label: 'X / Twitter' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'website', label: 'Other website' },
]

function Loaded({ initial, projectId }: { initial: ProjectInput; projectId?: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const isEdit = Boolean(projectId)

  const [form, setForm] = useState<ProjectInput>(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState<'draft' | 'published' | 'keep' | null>(null)
  const [dirty, setDirty] = useState(false)
  const slugTouched = useRef(isEdit)
  const orphans = useRef<string[]>([])
  const categories = useQuery(listCategoriesForAdmin, [])

  // Warn before closing the tab / reloading with unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const set = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
    if (errors[key as string]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const onName = (name: string) => {
    setForm((f) => ({ ...f, name, slug: slugTouched.current ? f.slug : slugify(name) }))
    setDirty(true)
    if (errors.name) setErrors((e) => ({ ...e, name: undefined }))
  }

  const setSocial = (key: keyof SocialLinks, value: string) => {
    setForm((f) => ({ ...f, social_links: { ...f.social_links, [key]: value } }))
    setDirty(true)
  }

  const leave = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return
    navigate('/admin/projects')
  }

  const save = async (mode: 'draft' | 'published' | 'keep') => {
    const next: ProjectInput = {
      ...form,
      publication_state: mode === 'keep' ? form.publication_state : mode,
      slug: form.slug.trim() || slugify(form.name),
    }

    const found = validateProjectInput(next)
    setErrors(found)
    if (hasErrors(found)) {
      toast.error('Please fix the highlighted fields.')
      return
    }

    setSaving(mode)
    try {
      // Friendly pre-check; the database UNIQUE constraint remains the source of truth.
      if (await isSlugTaken(next.slug, projectId)) {
        setErrors({ slug: 'That slug is already used by another project.' })
        toast.error('That slug is already in use.')
        return
      }

      const saved = isEdit ? await updateProject(projectId as string, next) : await createProject(next)

      // The database confirmed the write; only now clean up replaced images.
      await Promise.allSettled(orphans.current.map((u) => removeImageByUrl(u)))
      orphans.current = []

      setDirty(false)
      toast.success(
        mode === 'published' ? 'Project published.' : mode === 'draft' && isEdit ? 'Saved as draft.' : isEdit ? 'Changes saved.' : 'Draft created.',
      )
      if (isEdit) setForm(toInput(saved))
      else navigate(`/admin/projects/${saved.id}/edit`, { replace: true })
    } catch (e) {
      const err = toAppError(e)
      if (err.kind === 'duplicate') setErrors({ slug: 'That slug is already used by another project.' })
      toast.error(err.message)
    } finally {
      setSaving(null)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void save('keep')
  }

  const err = (k: string) => errors[k]
  const published = form.publication_state === 'published'
  const busy = saving !== null

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl space-y-6" noValidate>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={leave} className="btn btn-ghost h-10 w-10 !p-0" aria-label="Back to projects">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-fg">{isEdit ? 'Edit project' : 'New project'}</h1>
            <div className="mt-1 flex items-center gap-2">
              <PublicationBadge state={form.publication_state} />
              {dirty && <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>}
            </div>
          </div>
        </div>
        {isEdit && published && (
          <Link to={`/projects/${form.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            View public page <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </header>

      <CompletenessCard input={form} />

      <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="basics">
        <h2 id="basics" className="text-base font-semibold text-fg">Basics</h2>
        <FormField label="Name" htmlFor="p-name" required error={err('name')}>
          <input id="p-name" className="field" value={form.name} maxLength={LIMITS.name} onChange={(e) => onName(e.target.value)} aria-invalid={Boolean(err('name'))} aria-describedby={err('name') ? 'p-name-error' : undefined} />
        </FormField>
        <FormField label="Slug" htmlFor="p-slug" required error={err('slug')} hint={`Public address: /projects/${form.slug || 'your-slug'}`}>
          <input
            id="p-slug"
            className="field font-mono text-sm"
            value={form.slug}
            maxLength={LIMITS.slug}
            onChange={(e) => {
              slugTouched.current = true
              set('slug', e.target.value.toLowerCase())
            }}
            onBlur={() => {
              if (form.slug && !isValidSlug(form.slug)) setErrors((x) => ({ ...x, slug: 'Use lowercase letters, numbers and single hyphens only.' }))
            }}
            aria-invalid={Boolean(err('slug'))}
            aria-describedby={err('slug') ? 'p-slug-error' : undefined}
          />
        </FormField>
        <FormField label="Short description" htmlFor="p-short" required error={err('short_description')} hint={`${form.short_description.length}/${LIMITS.shortDescription}`}>
          <textarea id="p-short" rows={2} className="field" value={form.short_description} maxLength={LIMITS.shortDescription} onChange={(e) => set('short_description', e.target.value)} aria-invalid={Boolean(err('short_description'))} />
        </FormField>
        <FormField label="Full description" htmlFor="p-desc" error={err('description')} hint="Plain text. Line breaks are preserved; HTML is not rendered.">
          <textarea id="p-desc" rows={8} className="field" value={form.description} maxLength={LIMITS.description} onChange={(e) => set('description', e.target.value)} />
        </FormField>
      </section>

      <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="links">
        <h2 id="links" className="text-base font-semibold text-fg">Links</h2>
        <FormField label="External website URL" htmlFor="p-url" error={err('website_url')} hint="Use a verified https:// address. Leave empty if the project is not live yet.">
          <input id="p-url" type="url" inputMode="url" className="field" placeholder="https://" value={form.website_url} onChange={(e) => set('website_url', e.target.value)} aria-invalid={Boolean(err('website_url'))} />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Documentation URL" htmlFor="p-docs" error={err('documentation_url')}>
            <input id="p-docs" type="url" inputMode="url" className="field" placeholder="https://" value={form.documentation_url} onChange={(e) => set('documentation_url', e.target.value)} aria-invalid={Boolean(err('documentation_url'))} />
          </FormField>
          <FormField label="Source code URL" htmlFor="p-src" error={err('source_code_url')}>
            <input id="p-src" type="url" inputMode="url" className="field" placeholder="https://" value={form.source_code_url} onChange={(e) => set('source_code_url', e.target.value)} aria-invalid={Boolean(err('source_code_url'))} />
          </FormField>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg">Social links (optional)</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {SOCIALS.map(({ key, label }) => (
              <FormField key={key} label={label} htmlFor={`p-social-${key}`} error={err(`social.${key}`)}>
                <input id={`p-social-${key}`} type="url" inputMode="url" className="field" placeholder="https://" value={form.social_links[key] ?? ''} onChange={(e) => setSocial(key, e.target.value)} aria-invalid={Boolean(err(`social.${key}`))} />
              </FormField>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="media">
        <h2 id="media" className="text-base font-semibold text-fg">Images</h2>
        <ImageField id="p-logo" label="Logo" kind="logo" value={form.logo_url} error={err('logo_url')} onChange={(v) => set('logo_url', v)} onReplaced={(u) => orphans.current.push(u)} />
        <ImageField id="p-thumb" label="Thumbnail / cover" kind="thumbnail" value={form.thumbnail_url} error={err('thumbnail_url')} onChange={(v) => set('thumbnail_url', v)} onReplaced={(u) => orphans.current.push(u)} previewClass="h-24 w-40" />
      </section>

      <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="meta">
        <h2 id="meta" className="text-base font-semibold text-fg">Details</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Category" htmlFor="p-cat">
            <select id="p-cat" className="field" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">Uncategorised</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Project status" htmlFor="p-status" error={err('status')}>
            <select id="p-status" className="field" value={form.status} onChange={(e) => set('status', e.target.value as ProjectInput['status'])}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </FormField>
        </div>
        <ListInput id="p-features" label="Features" items={form.features} onChange={(v) => set('features', v)} placeholder="e.g. Generates QR codes instantly" />
        <ListInput id="p-tech" label="Technologies" items={form.technologies} onChange={(v) => set('technologies', v)} placeholder="e.g. React" />
        {!published && (
          <FormField label="Schedule publish (optional)" htmlFor="p-publish-at" error={err('publish_at')} hint="The draft goes live automatically at this time (your local time). Needs the pg_cron job from the v1.2.0 migration. Leave empty to publish manually.">
            <input id="p-publish-at" type="datetime-local" className="field" value={form.publish_at} onChange={(e) => set('publish_at', e.target.value)} aria-invalid={Boolean(err('publish_at'))} />
          </FormField>
        )}
        <Toggle checked={form.is_featured} onChange={(v) => set('is_featured', v)} label="Featured" description="Featured projects appear in the homepage highlights (only once published)." />
      </section>

      {isEdit && projectId && <UpdatesManager projectId={projectId} />}

      {categories.error && (
        <ErrorState error={categories.error} onRetry={categories.reload} />
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 glass-bar rounded-t-2xl border-t px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <button type="button" className="btn btn-ghost" onClick={leave} disabled={busy}>Cancel</button>
        {published ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => void save('draft')} disabled={busy}>
              {saving === 'draft' ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Undo2 className="h-4 w-4" aria-hidden />}
              Unpublish
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {saving === 'keep' ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              Save changes
            </button>
          </>
        ) : (
          <>
            <button type="submit" className="btn btn-secondary" disabled={busy}>
              {saving === 'keep' ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              Save draft
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void save('published')} disabled={busy}>
              {saving === 'published' ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              Publish
            </button>
          </>
        )}
      </div>
    </form>
  )
}

export default function ProjectForm() {
  const { id } = useParams()
  const { data, loading, error, reload } = useQuery<ProjectWithCategory | null>(
    () => (id ? getProjectById(id) : Promise.resolve(null)),
    [id],
  )

  if (!id) return <Loaded key="new" initial={EMPTY} />
  if (loading) return <Spinner />
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data) return <ErrorState error={new AppError('not_found', 'That project could not be found.')} />
  return <Loaded key={data.id} initial={toInput(data)} projectId={data.id} />
}
