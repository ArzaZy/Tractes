import type { Category, CategoryWithCount } from '../types'
import { AppError, toAppError, withTimeout } from './errors'
import { getClient } from './supabase'
import { isValidSlug } from './validation'

export interface CategoryInput {
  name: string
  slug: string
  description: string
  icon: string
}

export function validateCategoryInput(input: CategoryInput): Partial<Record<keyof CategoryInput, string>> {
  const errors: Partial<Record<keyof CategoryInput, string>> = {}
  if (!input.name.trim()) errors.name = 'Name is required.'
  else if (input.name.trim().length > 80) errors.name = 'Name must be 80 characters or fewer.'
  if (!isValidSlug(input.slug)) errors.slug = 'Use lowercase letters, numbers and single hyphens only.'
  if (input.description.length > 500) errors.description = 'Description must be 500 characters or fewer.'
  return errors
}

/** Categories with a published-project count taken from real rows. */
export async function listCategoriesWithCounts(opts: { onlyWithProjects?: boolean } = {}): Promise<CategoryWithCount[]> {
  try {
    const client = getClient()
    const [cats, counts] = await Promise.all([
      withTimeout(client.from('categories').select('*').order('name', { ascending: true })),
      withTimeout(client.from('category_project_counts').select('category_id,published_count')),
    ])
    if (cats.error) throw cats.error
    if (counts.error) throw counts.error

    const byId = new Map<string, number>()
    for (const row of counts.data ?? []) byId.set(row.category_id as string, row.published_count as number)

    const merged = ((cats.data ?? []) as Category[]).map((c) => ({ ...c, published_count: byId.get(c.id) ?? 0 }))
    return opts.onlyWithProjects ? merged.filter((c) => c.published_count > 0) : merged
  } catch (e) {
    throw toAppError(e)
  }
}

export async function getCategoryBySlug(slug: string): Promise<CategoryWithCount | null> {
  const all = await listCategoriesWithCounts()
  return all.find((c) => c.slug === slug) ?? null
}

/** Admin view: counts include drafts so deletion warnings are accurate. */
export async function listCategoriesForAdmin(): Promise<(Category & { total_count: number })[]> {
  try {
    const client = getClient()
    const [cats, projects] = await Promise.all([
      withTimeout(client.from('categories').select('*').order('name', { ascending: true })),
      withTimeout(client.from('projects').select('category_id')),
    ])
    if (cats.error) throw cats.error
    if (projects.error) throw projects.error
    const tally = new Map<string, number>()
    for (const p of projects.data ?? []) {
      const id = p.category_id as string | null
      if (id) tally.set(id, (tally.get(id) ?? 0) + 1)
    }
    return ((cats.data ?? []) as Category[]).map((c) => ({ ...c, total_count: tally.get(c.id) ?? 0 }))
  } catch (e) {
    throw toAppError(e)
  }
}

function row(input: CategoryInput) {
  return {
    name: input.name.trim(),
    slug: input.slug,
    description: input.description.trim() || null,
    icon: input.icon.trim() || null,
  }
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  try {
    const { data, error } = await withTimeout(getClient().from('categories').insert(row(input)).select('*').single())
    if (error) throw error
    return data as Category
  } catch (e) {
    throw toAppError(e)
  }
}

export async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  try {
    const { data, error } = await withTimeout(
      getClient().from('categories').update(row(input)).eq('id', id).select('*').maybeSingle(),
    )
    if (error) throw error
    if (!data) throw new AppError('permission', 'The category was not updated. You may not have permission.')
    return data as Category
  } catch (e) {
    throw toAppError(e)
  }
}

/** Linked projects are kept and become uncategorised (ON DELETE SET NULL). */
export async function deleteCategory(id: string): Promise<void> {
  try {
    const { data, error } = await withTimeout(getClient().from('categories').delete().eq('id', id).select('id'))
    if (error) throw error
    if (!data || data.length === 0) throw new AppError('permission', 'The category was not deleted. You may not have permission.')
  } catch (e) {
    throw toAppError(e)
  }
}
