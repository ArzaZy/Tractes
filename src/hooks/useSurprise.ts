import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRandomPublishedSlug } from '../lib/projects'
import { toAppError } from '../lib/errors'
import { useToast } from './useToast'

/** "Surprise me": opens a random published project. */
export function useSurprise() {
  const navigate = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const surprise = useCallback(async () => {
    setBusy(true)
    try {
      const slug = await getRandomPublishedSlug()
      if (slug) navigate(`/projects/${slug}`)
      else toast.error('No projects are published yet.')
    } catch (e) {
      toast.error(toAppError(e).message)
    } finally {
      setBusy(false)
    }
  }, [navigate, toast])

  return { surprise, busy }
}
