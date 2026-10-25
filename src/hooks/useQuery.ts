import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'
import { toAppError, type AppError } from '../lib/errors'

export interface QueryState<T> {
  data: T | null
  error: AppError | null
  loading: boolean
  reload: () => void
}

/**
 * Small data-fetching hook with cancellation of stale responses and a retry
 * ("reload") handle. `fetcher` is re-run whenever `deps` change.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: DependencyList): QueryState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    fetcherRef
      .current()
      .then((result) => {
        if (active) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setError(toAppError(e))
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { data, error, loading, reload }
}
