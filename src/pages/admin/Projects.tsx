import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Archive, ArchiveRestore, ExternalLink, Link2, Loader2, Eye, EyeOff, FilePlus2, Pencil, Star, Trash2 } from 'lucide-react'
import { useQuery } from '../../hooks/useQuery'
import { useDebounce } from '../../hooks/useDebounce'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { checkLinks, type LinkResult } from '../../lib/linkCheck'
import { deleteProject, listAdminProjects, patchProject } from '../../lib/projects'
import { removeImageByUrl } from '../../lib/upload'
import { toAppError } from '../../lib/errors'
import { totalPages } from '../../lib/exploreParams'
import { formatDate } from '../../lib/utils'
import { completeness } from '../../lib/completeness'
import { CompletenessBar } from '../../components/admin/Completeness'
import type { ProjectWithCategory, PublicationState } from '../../types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Pagination } from '../../components/Pagination'
import { EmptyState, ErrorState, Spinner } from '../../components/States'
import { PublicationBadge, StatusBadge } from '../../components/StatusBadge'
import { SearchBar } from '../../components/SearchBar'

const PAGE = 10

export default function AdminProjects() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
  const publication = (params.get('state') as PublicationState | null) ?? ''
  const q = params.get('q') ?? ''

  const [text, setText] = useState(q)
  const debounced = useDebounce(text, 350)
  const [pending, setPending] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<ProjectWithCategory | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { session } = useAuth()
  const [checking, setChecking] = useState(false)
  const [links, setLinks] = useState<Record<string, LinkResult>>({})

  const setQuery = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true })
  }

  useEffect(() => {
    if (debounced.trim() !== q.trim()) setQuery({ q: debounced.trim(), page: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { data, loading, error, reload } = useQuery(
    () =>
      listAdminProjects({
        search: q,
        publication: publication === 'draft' || publication === 'published' ? publication : '',
        sort: 'newest',
        page,
        pageSize: PAGE,
      }),
    [q, publication, page],
  )

  const act = async (id: string, run: () => Promise<void>, ok: string) => {
    setPending(id)
    try {
      await run()
      toast.success(ok)
      reload()
    } catch (e) {
      toast.error(toAppError(e).message)
    } finally {
      setPending(null)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteProject(toDelete.id)
      // Best-effort cleanup of owned images; failure must not hide the successful delete.
      await Promise.allSettled([toDelete.logo_url, toDelete.thumbnail_url].filter(Boolean).map((u) => removeImageByUrl(u as string)))
      toast.success(`Deleted “${toDelete.name}”.`)
      setToDelete(null)
      reload()
    } catch (e) {
      toast.error(toAppError(e).message)
    } finally {
      setDeleting(false)
    }
  }

  const items = data?.items ?? []

  const runLinkCheck = async () => {
    const token = session?.access_token
    const ids = items.filter((p) => p.website_url).map((p) => p.id)
    if (!token || ids.length === 0) {
      toast.error('No website links on this page to check.')
      return
    }
    setChecking(true)
    try {
      setLinks(await checkLinks(ids, token))
      toast.success('Link check finished.')
    } catch (e) {
      toast.error(toAppError(e).message)
    } finally {
      setChecking(false)
    }
  }
  const filtered = Boolean(q || publication)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-fg">Projects</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => void runLinkCheck()} disabled={checking || loading}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
            Check links
          </button>
          <Link to="/admin/projects/new" className="btn btn-primary">
            <FilePlus2 className="h-4 w-4" aria-hidden /> New project
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchBar value={text} onChange={setText} placeholder="Search projects…" label="Search projects" />
        </div>
        <div className="sm:w-48">
          <label htmlFor="pub-filter" className="sr-only">
            Filter by publication state
          </label>
          <select id="pub-filter" className="field" value={publication} onChange={(e) => setQuery({ state: e.target.value, page: '' })}>
            <option value="">All states</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title={filtered ? 'No projects match' : 'No projects yet'}
          description={filtered ? 'Try a different search or filter.' : 'Create your first project to get started.'}
          action={
            !filtered ? (
              <Link to="/admin/projects/new" className="btn btn-primary">
                New project
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[54rem] text-left text-sm">
              <caption className="sr-only">Projects</caption>
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Project</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">State</th>
                  <th scope="col" className="px-4 py-3 font-medium">Ready</th>
                  <th scope="col" className="px-4 py-3 font-medium">Updated</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((p) => {
                  const busy = pending === p.id
                  return (
                    <tr key={p.id} className={busy ? 'opacity-60' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/admin/projects/${p.id}/edit`} className="font-medium text-fg hover:text-accent">
                            {p.name}
                          </Link>
                          {p.is_featured && <Star className="h-3.5 w-3.5 text-violet" aria-label="Featured" />}
                        </div>
                        <p className="text-xs text-muted">/{p.slug}{p.category ? ` · ${p.category.name}` : ''}</p>
                        {links[p.id] && (
                          <p
                            className={`mt-1 text-xs font-medium ${links[p.id]?.state === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : links[p.id]?.state === 'redirect' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}
                          >
                            Link: {links[p.id]?.state}
                            {links[p.id]?.httpStatus ? ` (${links[p.id]?.httpStatus})` : ''}
                            {links[p.id]?.message ? ` · ${links[p.id]?.message}` : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3"><PublicationBadge state={p.publication_state} /></td>
                      <td className="px-4 py-3"><CompletenessBar score={completeness(p).score} /></td>
                      <td className="px-4 py-3 text-muted">{formatDate(p.updated_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm !px-2"
                            disabled={busy}
                            aria-pressed={p.is_featured}
                            aria-label={p.is_featured ? `Remove ${p.name} from featured` : `Feature ${p.name}`}
                            title={p.is_featured ? 'Unfeature' : 'Feature'}
                            onClick={() =>
                              void act(p.id, () => patchProject(p.id, { is_featured: !p.is_featured }), p.is_featured ? 'Removed from featured.' : 'Marked as featured.')
                            }
                          >
                            <Star className={`h-4 w-4 ${p.is_featured ? 'fill-current text-violet' : ''}`} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm !px-2"
                            disabled={busy}
                            aria-label={p.publication_state === 'published' ? `Unpublish ${p.name}` : `Publish ${p.name}`}
                            title={p.publication_state === 'published' ? 'Unpublish' : 'Publish'}
                            onClick={() =>
                              void act(
                                p.id,
                                () => patchProject(p.id, { publication_state: p.publication_state === 'published' ? 'draft' : 'published' }),
                                p.publication_state === 'published' ? 'Unpublished.' : 'Published.',
                              )
                            }
                          >
                            {p.publication_state === 'published' ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm !px-2"
                            disabled={busy}
                            aria-label={p.status === 'archived' ? `Restore ${p.name} from archive` : `Archive ${p.name}`}
                            title={p.status === 'archived' ? 'Restore from archive' : 'Archive'}
                            onClick={() =>
                              void act(
                                p.id,
                                () => patchProject(p.id, { status: p.status === 'archived' ? 'development' : 'archived' }),
                                p.status === 'archived' ? 'Restored to “In Development”.' : 'Archived.',
                              )
                            }
                          >
                            {p.status === 'archived' ? <ArchiveRestore className="h-4 w-4" aria-hidden /> : <Archive className="h-4 w-4" aria-hidden />}
                          </button>
                          <Link
                            to={`/projects/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm !px-2"
                            aria-label={`Preview ${p.name} on the site (opens in a new tab)`}
                            title={p.publication_state === 'draft' ? 'Preview draft (admin only)' : 'View on site'}
                          >
                            <ExternalLink className="h-4 w-4" aria-hidden />
                          </Link>
                          <Link to={`/admin/projects/${p.id}/edit`} className="btn btn-ghost btn-sm !px-2" aria-label={`Edit ${p.name}`} title="Edit">
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Link>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm !px-2 hover:!text-red-500"
                            disabled={busy}
                            aria-label={`Delete ${p.name}`}
                            title="Delete"
                            onClick={() => setToDelete(p)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={Math.min(page, totalPages(data?.total ?? 0, PAGE))} totalPages={totalPages(data?.total ?? 0, PAGE)} onChange={(n) => setQuery({ page: n > 1 ? String(n) : '' })} />
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this project?"
        confirmLabel="Delete project"
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      >
        <p>
          “{toDelete?.name}” will be permanently removed, along with its uploaded images. This cannot be undone. To hide it without
          deleting, unpublish it instead.
        </p>
      </ConfirmDialog>
    </div>
  )
}
