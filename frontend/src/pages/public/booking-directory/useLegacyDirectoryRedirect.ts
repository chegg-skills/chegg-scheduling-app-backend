import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { PublicBookingDirectoryData } from '@/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Legacy redirect: old query-param URLs (?category=key&team=slug or ?category=UUID)
 * are redirected to the path-based equivalent /book/sessions/:eventTypeKey/:teamSlug.
 * No-op when no legacy params are present or the directory has not loaded yet.
 */
export function useLegacyDirectoryRedirect(
  bookingDirectory: PublicBookingDirectoryData | null | undefined
) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const categoryParam = searchParams.get('category')
    const teamParam = searchParams.get('team')
    if (!categoryParam && !teamParam) return
    if (!bookingDirectory) return

    const resolveCategory = () => {
      if (!categoryParam) return null
      if (!UUID_RE.test(categoryParam)) return categoryParam
      // UUID refers to an EventType.id — resolve to its key
      return (
        bookingDirectory.sections.find((s) => s.eventType.id === categoryParam)?.eventType.key ??
        null
      )
    }
    const resolvedCategory = resolveCategory()
    if (!resolvedCategory) {
      navigate('/book/sessions', { replace: true })
      return
    }

    const resolveTeam = () => {
      if (!teamParam) return null
      if (!UUID_RE.test(teamParam)) return teamParam
      const section = bookingDirectory.sections.find((s) => s.eventType.key === resolvedCategory)
      return section?.teams.find((t) => t.team.id === teamParam)?.team.publicBookingSlug ?? null
    }
    const resolvedTeam = resolveTeam()

    const dest = resolvedTeam
      ? `/book/sessions/${resolvedCategory}/${resolvedTeam}`
      : `/book/sessions/${resolvedCategory}`
    navigate(dest, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingDirectory])
}
