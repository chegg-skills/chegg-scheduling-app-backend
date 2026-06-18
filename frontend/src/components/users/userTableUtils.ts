import type { SafeUser } from '@/types'
import type { SortAccessorMap } from '@/hooks/useTableSort'
import { getUserRoleBadgeProps } from '@/utils/userDisplay'

// Re-exported for back-compat; the canonical definition lives in @/utils/userDisplay.
export { getUserRoleBadgeProps }

export type UserSortKey = 'user' | 'role' | 'timezone' | 'status' | 'zoomExpiry' | 'bookingLink'

export const userSortAccessors: SortAccessorMap<SafeUser, UserSortKey> = {
  user: (user) => `${user.firstName} ${user.lastName}`,
  role: (user) => user.role,
  timezone: (user) => user.timezone,
  status: (user) => user.isActive,
  zoomExpiry: (user) => user.zoomIsvLinkExpiresAt ?? '',
  bookingLink: () => '',
}

export const userTableColumns: Array<{ label: string; sortKey: UserSortKey }> = [
  { label: 'User', sortKey: 'user' },
  { label: 'Role', sortKey: 'role' },
  { label: 'Timezone', sortKey: 'timezone' },
  { label: 'Status', sortKey: 'status' },
  { label: 'ISV link', sortKey: 'zoomExpiry' },
  { label: 'Booking link', sortKey: 'bookingLink' },
]

export function getUserStatusBadgeProps(isActive: boolean) {
  return {
    label: isActive ? 'Active' : 'Inactive',
    color: isActive ? ('green' as const) : ('red' as const),
  }
}

import { formatDistanceToNow, isPast, isToday } from 'date-fns'

export function getZoomExpiryLabel(expiresAt: string | null) {
  if (!expiresAt) return { label: 'N/A', color: 'gray' as const }

  const expiryDate = new Date(expiresAt)

  if (isPast(expiryDate)) {
    return { label: 'Expired', color: 'red' as const }
  }

  if (isToday(expiryDate)) {
    return { label: 'Expires today', color: 'yellow' as const }
  }

  return {
    label: `Expiring in ${formatDistanceToNow(expiryDate)}`,
    color: 'blue' as const,
  }
}
