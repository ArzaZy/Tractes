import { toAppError, withTimeout, AppError } from './errors'
import { getClient } from './supabase'

export interface ProjectUpdate {
  id: string
  project_id: string
  version: string | null
  note: string
  created_at: string
}

export interface UpdateInput {
  version: string
  note: string
}

const VERSION_RE = /^[0-9A-Za-z.+-]{1,20}$/

/** Strips a leading "v" so the UI can always render "v" + version. */
export function normaliseVersion(v: string): string {
  return v.trim().replace(/^v(?=\d)/i, '')
}

export function validateUpdate(input: UpdateInput): Partial<Record<keyof UpdateInput, string>> {
  const errors: Partial<Record<keyof UpdateInput, string>> = {}
  const v = normaliseVersion(input.version)
  if (v && !VERSION_RE.test(v)) errors.version = 'Use letters, numbers, dots and hyphens, up to 20 characters.'
  const note = input.note.trim()
  if (!note) errors.note = 'Write what changed.'
  else if (note.length > 500) errors.note = 'Keep it under 500 characters.'
  return errors
}

export async function listProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
  try {
    const { data, error } = await withTimeout(
      getClient().from('project_updates').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(50),
    )
    if (error) throw error
    return (data ?? []) as ProjectUpdate[]
  } catch (e) {
    throw toAppError(e)
  }
}

export async function addProjectUpdate(projectId: string, input: UpdateInput): Promise<ProjectUpdate> {
  try {
    const { data, error } = await withTimeout(
      getClient()
        .from('project_updates')
        .insert({ project_id: projectId, version: normaliseVersion(input.version) || null, note: input.note.trim() })
        .select('*')
        .single(),
    )
    if (error) throw error
    return data as ProjectUpdate
  } catch (e) {
    throw toAppError(e)
  }
}

export async function deleteProjectUpdate(id: string): Promise<void> {
  try {
    const { data, error } = await withTimeout(getClient().from('project_updates').delete().eq('id', id).select('id'))
    if (error) throw error
    if (!data || data.length === 0) throw new AppError('permission', 'The entry was not deleted. You may not have permission.')
  } catch (e) {
    throw toAppError(e)
  }
}
