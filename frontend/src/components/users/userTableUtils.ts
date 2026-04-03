import type { SafeUser, UserRole } from '@/types'
import type { SortAccessorMap } from '@/hooks/useTableSort'

export type UserSortKey = 'user' | 'role' | 'country' | 'timezone' | 'language' | 'status'

export const userSortAccessors: SortAccessorMap<SafeUser, UserSortKey> = {
  user: (user) => `${user.firstName} ${user.lastName}`,
  role: (user) => user.role,
  country: (user) => user.country ?? '',
  timezone: (user) => user.timezone,
  language: (user) => user.preferredLanguage ?? '',
  status: (user) => user.isActive,
}

export const userTableColumns: Array<{ label: string; sortKey: UserSortKey }> = [
  { label: 'User', sortKey: 'user' },
  { label: 'Role', sortKey: 'role' },
  { label: 'Country', sortKey: 'country' },
  { label: 'Timezone', sortKey: 'timezone' },
  { label: 'Language', sortKey: 'language' },
  { label: 'Status', sortKey: 'status' },
]

export function getUserStatusBadgeProps(isActive: boolean) {
  return {
    label: isActive ? 'Active' : 'Inactive',
    variant: isActive ? 'green' : 'red',
  } as const
}

export function getUserRoleBadgeProps(role: UserRole) {
  const variants: Record<UserRole, 'blue' | 'yellow' | 'gray'> = {
    SUPER_ADMIN: 'blue',
    TEAM_ADMIN: 'yellow',
    COACH: 'gray',
  }

  return {
    label: role.replace('_', ' '),
    variant: variants[role],
  } as const
}
