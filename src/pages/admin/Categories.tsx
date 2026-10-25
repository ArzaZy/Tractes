import { useRef, useState, type FormEvent } from 'react'
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useQuery } from '../../hooks/useQuery'
import { useToast } from '../../hooks/useToast'
import {
  createCategory,
  deleteCategory,
  listCategoriesForAdmin,
  updateCategory,
  validateCategoryInput,
  type CategoryInput,
} from '../../lib/categories'
import { toAppError } from '../../lib/errors'
import { slugify } from '../../lib/validation'
import { CategoryIcon, ICON_NAMES } from '../../components/CategoryIcon'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState, ErrorState, Spinner } from '../../components/States'
import { FormField } from '../../components/admin/FormParts'

type Row = Awaited<ReturnType<typeof listCategoriesForAdmin>>[number]

const BLANK: CategoryInput = { name: '', slug: '', description: '', icon: 'Folder' }

export default function AdminCategories() {
  const toast = useToast()
  const { data, loading, error, reload } = useQuery(listCategoriesForAdmin, [])

  const [editing, setEditing] = useState<{ id: string | null; values: CategoryInput } | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof CategoryInput, string>>>({})
  const [saving, setSaving] = useState(false)
  const slugTouched = useRef(false)

  const [toDelete, setToDelete] = useState<Row | null>(null)
  const [deleting, setDeleting] = useState(false)

  const open = (row?: Row) => {
    slugTouched.current = Boolean(row)
    setErrors({})
    setEditing(
      row
        ? { id: row.id, values: { name: row.name, slug: row.slug, description: row.description ?? '', icon: row.icon ?? 'Folder' } }
        : { id: null, values: BLANK },
    )
  }

  const patch = (p: Partial<CategoryInput>) => setEditing((e) => (e ? { ...e, values: { ...e.values, ...p } } : e))

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!editing) return
    const v = { ...editing.values, slug: editing.values.slug || slugify(editing.values.name) }
    const found = validateCategoryInput(v)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    if ((data ?? []).some((c) => c.slug === v.slug && c.id !== editing.id)) {
      setErrors({ slug: 'That slug is already used by another category.' })
      return
    }

    setSaving(true)
    try {
      if (editing.id) await updateCategory(editing.id, v)
      else await createCategory(v)
      toast.success(editing.id ? 'Category updated.' : 'Category created.')
      setEditing(null)
      reload()
    } catch (e) {
      const err = toAppError(e)
      if (err.kind === 'duplicate') setErrors({ slug: 'That slug is already used by another category.' })
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteCategory(toDelete.id)
      toast.success(`Deleted “${toDelete.name}”.`)
      setToDelete(null)
      reload()
    } catch (e) {
      toast.error(toAppError(e).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-fg">Categories</h1>
        {!editing && (
          <button type="button" className="btn btn-primary" onClick={() => open()}>
            <Plus className="h-4 w-4" aria-hidden /> New category
          </button>
        )}
      </header>

      {editing && (
        <form onSubmit={(e) => void submit(e)} className="card space-y-4 p-5" noValidate aria-label={editing.id ? 'Edit category' : 'New category'}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-fg">{editing.id ? 'Edit category' : 'New category'}</h2>
            <button type="button" className="btn btn-ghost h-9 w-9 !p-0" onClick={() => setEditing(null)} aria-label="Close form" disabled={saving}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="c-name" required error={errors.name}>
              <input
                id="c-name"
                className="field"
                maxLength={80}
                value={editing.values.name}
                onChange={(e) => patch({ name: e.target.value, ...(slugTouched.current ? {} : { slug: slugify(e.target.value) }) })}
                aria-invalid={Boolean(errors.name)}
              />
            </FormField>
            <FormField label="Slug" htmlFor="c-slug" required error={errors.slug}>
              <input
                id="c-slug"
                className="field font-mono text-sm"
                maxLength={80}
                value={editing.values.slug}
                onChange={(e) => {
                  slugTouched.current = true
                  patch({ slug: e.target.value.toLowerCase() })
                }}
                aria-invalid={Boolean(errors.slug)}
              />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="c-desc" error={errors.description}>
            <textarea id="c-desc" rows={2} className="field" maxLength={500} value={editing.values.description} onChange={(e) => patch({ description: e.target.value })} />
          </FormField>
          <FormField label="Icon" htmlFor="c-icon">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-accent">
                <CategoryIcon name={editing.values.icon} />
              </span>
              <select id="c-icon" className="field" value={editing.values.icon} onChange={(e) => patch({ icon: e.target.value })}>
                {ICON_NAMES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
              {editing.id ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No categories" description="Create categories, or run supabase/seed.sql to add the starter set." />
      ) : (
        <ul className="card divide-y divide-line">
          {(data ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2 text-accent">
                <CategoryIcon name={c.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-fg">{c.name}</p>
                <p className="truncate text-xs text-muted">
                  /{c.slug} · {c.total_count} {c.total_count === 1 ? 'project' : 'projects'}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" className="btn btn-ghost btn-sm !px-2" onClick={() => open(c)} aria-label={`Edit ${c.name}`}>
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" className="btn btn-ghost btn-sm !px-2 hover:!text-red-500" onClick={() => setToDelete(c)} aria-label={`Delete ${c.name}`}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete “${toDelete?.name ?? ''}”?`}
        confirmLabel={toDelete && toDelete.total_count > 0 ? 'Delete and uncategorise projects' : 'Delete category'}
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      >
        {toDelete && toDelete.total_count > 0 ? (
          <p>
            {toDelete.total_count} {toDelete.total_count === 1 ? 'project uses' : 'projects use'} this category. They will not be
            deleted; they will become <strong>uncategorised</strong> until you assign a new category.
          </p>
        ) : (
          <p>No projects use this category. This cannot be undone.</p>
        )}
      </ConfirmDialog>
    </div>
  )
}
