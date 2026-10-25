export const PROJECT_STATUSES = ['development', 'beta', 'live', 'archived'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PUBLICATION_STATES = ['draft', 'published'] as const
export type PublicationState = (typeof PUBLICATION_STATES)[number]

export type SortOption = 'featured' | 'newest' | 'name'

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  created_at: string
  updated_at: string
}

export interface CategoryWithCount extends Category {
  published_count: number
}

export type CategoryRef = Pick<Category, 'id' | 'name' | 'slug' | 'icon'>

export interface SocialLinks {
  github?: string
  twitter?: string
  linkedin?: string
  instagram?: string
  youtube?: string
  website?: string
}

export interface Project {
  id: string
  name: string
  slug: string
  short_description: string
  description: string | null
  website_url: string | null
  logo_url: string | null
  thumbnail_url: string | null
  category_id: string | null
  status: ProjectStatus
  publication_state: PublicationState
  is_featured: boolean
  features: string[]
  technologies: string[]
  documentation_url: string | null
  source_code_url: string | null
  social_links: SocialLinks
  created_at: string
  updated_at: string
  published_at: string | null
  /** When set on a draft, the database publishes it automatically at this time. */
  publish_at: string | null
}

export interface ProjectWithCategory extends Project {
  category: CategoryRef | null
}

/** Shape of the writable fields in the admin form / database. */
export interface ProjectInput {
  name: string
  slug: string
  short_description: string
  description: string
  website_url: string
  logo_url: string
  thumbnail_url: string
  category_id: string
  status: ProjectStatus
  publication_state: PublicationState
  is_featured: boolean
  features: string[]
  technologies: string[]
  documentation_url: string
  source_code_url: string
  social_links: SocialLinks
  /** `datetime-local` value in the admin's local time, or '' for none. */
  publish_at: string
}

export interface SiteSettings {
  id: number
  site_name: string
  tagline: string
  logo_url: string | null
  default_theme: 'dark' | 'light'
  contact_email: string | null
  social_links: SocialLinks
  seo_title: string | null
  seo_description: string | null
  updated_at: string
}

export interface PagedResult<T> {
  items: T[]
  total: number
}

export interface ProjectUpdate {
  id: string
  project_id: string
  version: string | null
  note: string
  created_at: string
}

export interface ViewRow {
  project_id: string
  day: string
  views: number
}

export interface TechCount {
  name: string
  count: number
}
