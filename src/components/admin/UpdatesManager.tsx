import { useState } from 'react'
import { History, Loader2, Plus, Trash2 } from 'lucide-react'
import { useQuery } from '../../hooks/useQuery'
import { useToast } from '../../hooks/useToast'
import { addProjectUpdate, deleteProjectUpdate, listProjectUpdates, validateUpdate } from '../../lib/updates'
import { toAppError } from '../../lib/errors'
import { formatDate } from '../../lib/utils'
import { FormField } from './FormParts'

/** Release notes shown on the public project page as "Update history". Saved immediately, separate from the form. */
export function UpdatesManager({ projectId }: { projectId: string }) {
  const toast = useToast()
  const list = useQuery(() => listProjectUpdates(projectId), [projectId])
  const [version, setVersion] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<{ version?: string; note?: string }>({})
  const [busy, setBusy] = useState(false)

  const add = async () => {
    const found = validateUpdate({ version, note })
    setErrors(found)
    if (found.version || found.note) return
    setBusy(true)
    try {
      await addProjectUpdate(projectId, { version, note })
      setVersion('')
      setNote('')
      list.reload()
      toast.success('Update added.')
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteProjectUpdate(id)
      list.reload()
    } catch (err) {
      toast.error(toAppError(err).message)
    }
  }

  return (
    <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="updates">
      <h2 id="updates" className="flex items-center gap-2 text-base font-semibold text-fg">
        <History className="h-4 w-4 text-accent" aria-hidden /> Update history
      </h2>
      <p className="text-sm text-muted">Short release notes visitors see on the project page. Saved immediately.</p>

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
        <FormField label="Version" htmlFor="u-version" error={errors.version}>
          <input id="u-version" className="field" placeholder="1.2" value={version} maxLength={21} onChange={(e) => setVersion(e.target.value)} />
        </FormField>
        <FormField label="What changed" htmlFor="u-note" error={errors.note}>
          <input id="u-note" className="field" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void add()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          Add
        </button>
      </div>

      {(list.data?.length ?? 0) > 0 && (
        <ul className="divide-y divide-line">
          {list.data?.map((u) => (
            <li key={u.id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div>
                <span className="text-xs text-muted">
                  {u.version ? `v${u.version} · ` : ''}
                  {formatDate(u.created_at)}
                </span>
                <p className="text-fg">{u.note}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" aria-label={`Delete update ${u.version ?? ''}`} onClick={() => void remove(u.id)}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
