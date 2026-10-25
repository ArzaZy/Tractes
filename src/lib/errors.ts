export type AppErrorKind =
  | 'config'
  | 'network'
  | 'timeout'
  | 'auth'
  | 'permission'
  | 'duplicate'
  | 'not_found'
  | 'validation'
  | 'unknown'

/** Error whose message is always safe to show to a visitor. */
export class AppError extends Error {
  kind: AppErrorKind
  constructor(kind: AppErrorKind, message: string) {
    super(message)
    this.name = 'AppError'
    this.kind = kind
  }
}

const MESSAGES: Record<AppErrorKind, string> = {
  config: 'The site is not connected to its database yet. The owner needs to configure Supabase.',
  network: 'We could not reach the server. Check your connection and try again.',
  timeout: 'The request took too long. Please try again.',
  auth: 'Your session has expired. Please sign in again.',
  permission: 'You do not have permission to do that.',
  duplicate: 'That value is already in use. Please choose another one.',
  not_found: 'We could not find what you were looking for.',
  validation: 'Some of the information is not valid.',
  unknown: 'Something went wrong. Please try again.',
}

interface SupabaseLikeError {
  code?: string
  status?: number
  message?: string
}

/**
 * Normalises anything thrown by Supabase / fetch into an AppError with a safe
 * message. Raw database messages are never forwarded to the UI.
 */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err

  const e = (err ?? {}) as SupabaseLikeError
  const message = typeof e.message === 'string' ? e.message : ''

  if (e.code === '23505') return new AppError('duplicate', MESSAGES.duplicate)
  if (e.code === '42501' || e.status === 403) return new AppError('permission', MESSAGES.permission)
  if (e.code === 'PGRST301' || e.status === 401 || /jwt expired/i.test(message)) {
    return new AppError('auth', MESSAGES.auth)
  }
  if (e.code === 'PGRST116') return new AppError('not_found', MESSAGES.not_found)
  if (e.code === '23514' || e.code === '22P02' || e.code === '23502') {
    return new AppError('validation', MESSAGES.validation)
  }
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return new AppError('network', MESSAGES.network)
  }
  return new AppError('unknown', MESSAGES.unknown)
}

export function messageFor(kind: AppErrorKind): string {
  return MESSAGES[kind]
}

export function withTimeout<T>(promise: PromiseLike<T>, ms = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AppError('timeout', MESSAGES.timeout)), ms)
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}
