import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AppError, messageFor } from './errors'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

// Only the public publishable/anon key is ever used in the browser. Authorization
// is enforced by Row Level Security in the database, not by this client.
const client: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, key as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null

export function getClient(): SupabaseClient {
  if (!client) throw new AppError('config', messageFor('config'))
  return client
}
