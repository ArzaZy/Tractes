import type { SiteSettings } from '../types'
import { AppError, toAppError, withTimeout } from './errors'
import { getClient } from './supabase'
import { cleanSocialLinks, isSafeExternalUrl, isValidEmail, validateSocialLinks, type FieldErrors } from './validation'

export const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  site_name: 'TracLabs',
  tagline: 'Your Digital Projects, One Place.',
  logo_url: null,
  default_theme: 'dark',
  contact_email: null,
  social_links: {},
  seo_title: null,
  seo_description: null,
  updated_at: '',
}

export async function getSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await withTimeout(getClient().from('site_settings').select('*').eq('id', 1).maybeSingle())
    if (error) throw error
    if (!data) return DEFAULT_SETTINGS
    const s = data as SiteSettings
    return { ...DEFAULT_SETTINGS, ...s, social_links: s.social_links ?? {} }
  } catch (e) {
    throw toAppError(e)
  }
}

export type SettingsInput = Omit<SiteSettings, 'id' | 'updated_at'>

export function validateSettings(s: SettingsInput): FieldErrors {
  const errors: FieldErrors = {}
  if (!s.site_name.trim()) errors.site_name = 'Site name is required.'
  if (s.tagline.length > 160) errors.tagline = 'Tagline must be 160 characters or fewer.'
  if (s.contact_email && !isValidEmail(s.contact_email)) errors.contact_email = 'Enter a valid email address.'
  if (s.logo_url && !isSafeExternalUrl(s.logo_url)) errors.logo_url = 'Enter a valid http(s) URL.'
  if ((s.seo_title ?? '').length > 70) errors.seo_title = 'Keep the SEO title under 70 characters.'
  if ((s.seo_description ?? '').length > 200) errors.seo_description = 'Keep the SEO description under 200 characters.'
  Object.assign(errors, validateSocialLinks(s.social_links))
  return errors
}

export async function saveSettings(s: SettingsInput): Promise<SiteSettings> {
  try {
    const payload = {
      site_name: s.site_name.trim(),
      tagline: s.tagline.trim(),
      logo_url: s.logo_url?.trim() || null,
      default_theme: s.default_theme,
      contact_email: s.contact_email?.trim() || null,
      social_links: cleanSocialLinks(s.social_links),
      seo_title: s.seo_title?.trim() || null,
      seo_description: s.seo_description?.trim() || null,
    }
    const { data, error } = await withTimeout(
      getClient().from('site_settings').update(payload).eq('id', 1).select('*').maybeSingle(),
    )
    if (error) throw error
    if (!data) throw new AppError('permission', 'Settings were not saved. Run the seed first, or check your admin permission.')
    return data as SiteSettings
  } catch (e) {
    throw toAppError(e)
  }
}
