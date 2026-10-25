import { toAppError, AppError, withTimeout } from './errors'
import { getClient } from './supabase'
import { buildImagePath, validateImageFile } from './validation'

const BUCKET = 'project-images'

/**
 * Uploads a validated image under a random, server-neutral name. The bucket is
 * public, so the returned URL is world-readable. Storage policies restrict who
 * may write; this function never trusts the original filename.
 */
export async function uploadImage(file: File, kind: 'logo' | 'thumbnail' | 'site'): Promise<string> {
  const problem = validateImageFile(file)
  if (problem) throw new AppError('validation', problem)

  try {
    const path = buildImagePath(kind, file.type, crypto.randomUUID())
    const storage = getClient().storage.from(BUCKET)
    const { error } = await withTimeout(
      storage.upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false }),
      30000,
    )
    if (error) throw error
    return storage.getPublicUrl(path).data.publicUrl
  } catch (e) {
    const err = toAppError(e)
    if (err.kind === 'unknown') throw new AppError('unknown', 'The upload failed. Please try again.')
    throw err
  }
}

/** Removes an object if (and only if) the URL points into our bucket. */
export async function removeImageByUrl(url: string): Promise<void> {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0] ?? '')
  if (!path) return
  try {
    const { error } = await withTimeout(getClient().storage.from(BUCKET).remove([path]))
    if (error) throw error
  } catch (e) {
    throw toAppError(e)
  }
}
