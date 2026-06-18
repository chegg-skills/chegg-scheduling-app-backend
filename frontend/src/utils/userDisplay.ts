import type { UserRole } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'

/**
 * Builds a user's initials from first/last name (e.g. "John", "Doe" → "JD").
 * Returns the raw first characters without forcing case — callers that need
 * upper-case initials should append `.toUpperCase()` to preserve their styling.
 */
export function getUserInitials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`
}

export function getUserRoleBadgeProps(role: UserRole) {
  const colors: Record<UserRole, 'blue' | 'yellow' | 'gray'> = {
    SUPER_ADMIN: 'blue',
    TEAM_ADMIN: 'yellow',
    COACH: 'gray',
  }

  return {
    label: toTitleCase(role.replace('_', ' ')),
    color: colors[role],
  }
}
