import type { SafeUser, UserRole } from '@/types'
import type { SortAccessorMap } from '@/hooks/useTableSort'
import { toTitleCase } from '@/utils/toTitleCase'

export type UserSortKey = 'user' | 'role' | 'timezone' | 'status' | 'bookingLink'

export const userSortAccessors: SortAccessorMap<SafeUser, UserSortKey> = {
  user: (user) => `${user.firstName} ${user.lastName}`,
  role: (user) => user.role,
  timezone: (user) => user.timezone,
  status: (user) => user.isActive,
  bookingLink: () => '',
}

export const userTableColumns: Array<{ label: string; sortKey: UserSortKey }> = [
  { label: 'User', sortKey: 'user' },
  { label: 'Role', sortKey: 'role' },
  { label: 'Timezone', sortKey: 'timezone' },
  { label: 'Status', sortKey: 'status' },
  { label: 'Booking link', sortKey: 'bookingLink' },
]

export function getUserStatusBadgeProps(isActive: boolean) {
  return {
    label: isActive ? 'Active' : 'Inactive',
    color: isActive ? ('green' as const) : ('red' as const),
  }
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
