import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import type { UserRole } from '@/types'

const INTERNAL_ROLES: UserRole[] = ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH']

/**
 * Silently detects whether the current visitor is a signed-in internal user
 * (admin/coach) while on an otherwise-public page. Calls `GET /users/me` once on
 * mount; a 401 (unauthenticated student) resolves to `{ user: null }` without
 * redirecting — the shared axios interceptor already exempts public routes
 * (`/book`, `/reschedule`, `/cancel`), so no plain-fetch workaround is needed.
 *
 * Used to conditionally surface the admin-only "Availability Debug" tab in the
 * public Troubleshoot dialog. Students never trigger any visible change.
 */
export function usePublicSessionUser() {
  const { data } = useQuery({
    queryKey: ['public-session-user'],
    queryFn: ({ signal }) => usersApi.getMe(signal).then((r) => r.data.data ?? null),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const user = data ?? null
  const isInternalUser = !!user && INTERNAL_ROLES.includes(user.role)
  return { user, isInternalUser }
}
