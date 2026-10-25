import { useId, useRef, useState, type ReactNode } from 'react'
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react'
import { ALLOWED_IMAGE_TYPES, isSafeExternalUrl, validateImageFile } from '../../lib/validation'
import { uploadImage } from '../../lib/upload'
import { toAppError } from '../../lib/errors'
import { SafeImage } from '../SafeImage'

export function FormField({
  label,
  error,
  hint,
  required,
  htmlFor,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
        {required && (
          <span className="text-red-500" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border border-line transition-colors ${checked ? 'bg-accent-strong' : 'bg-surface-2'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}

/** Editable list of short strings (features, technologies). */
export function ListInput({
  label,
  items,
  onChange,
  placeholder,
  max = 30,
  id,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  max?: number
  id: string
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const v = draft.trim()
    if (!v || items.length >= max) return
    if (items.some((i) => i.toLowerCase() === v.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...items, v.slice(0, 120)])
    setDraft('')
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          className="field"
          value={draft}
          maxLength={120}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button type="button" className="btn btn-secondary shrink-0" onClick={add} disabled={!draft.trim() || items.length >= max}>
          <Plus className="h-4 w-4" aria-hidden /> Add
        </button>
      </div>
      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 py-1 pl-2.5 pr-1 text-sm text-fg">
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="rounded p-1 text-muted hover:text-red-500"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-muted">Press Enter to add. Up to {max} items.</p>
    </div>
  )
}

/** Image upload with preview, replace, remove, and an optional pasted URL. */
export function ImageField({
  label,
  kind,
  value,
  onChange,
  onReplaced,
  error,
  id,
  previewClass = 'h-24 w-24',
}: {
  label: string
  kind: 'logo' | 'thumbnail' | 'site'
  value: string
  onChange: (url: string) => void
  /** Called with the previous URL when it is replaced or removed, so it can be cleaned up after saving. */
  onReplaced?: (oldUrl: string) => void
  error?: string
  id: string
  previewClass?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const pick = async (file: File | undefined) => {
    if (!file) return
    setUploadError('')
    const problem = validateImageFile(file)
    if (problem) {
      setUploadError(problem)
      return
    }
    setBusy(true)
    try {
      const url = await uploadImage(file, kind)
      if (value) onReplaced?.(value)
      onChange(url)
    } catch (e) {
      setUploadError(toAppError(e).message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const shown = isSafeExternalUrl(value) ? value : null

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-fg" id={`${id}-label`}>
        {label}
      </p>
      <div className="flex items-start gap-4">
        <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-2 ${previewClass}`}>
          <SafeImage
            src={shown}
            alt={shown ? `${label} preview` : ''}
            className="h-full w-full object-cover"
            fallback={<ImagePlus className="h-6 w-6 text-muted" aria-hidden />}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
              {value ? 'Replace' : 'Upload'}
            </button>
            {value && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  onReplaced?.(value)
                  onChange('')
                }}
                disabled={busy}
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Remove
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            className="sr-only"
            aria-labelledby={`${id}-label`}
            onChange={(e) => void pick(e.target.files?.[0])}
            tabIndex={-1}
          />
          <input
            id={id}
            className="field"
            inputMode="url"
            placeholder="…or paste an https:// image URL"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label} URL`}
            aria-invalid={Boolean(error)}
          />
          <p className="text-xs text-muted">JPEG, PNG, WebP or AVIF, up to 2 MB. Uploaded images are public.</p>
          {(uploadError || error) && (
            <p role="alert" className="text-xs text-red-500">
              {uploadError || error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
