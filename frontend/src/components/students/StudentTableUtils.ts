import type { StudentSummary } from '@/types'
import type { SortAccessorMap } from '@/hooks/useTableSort'

export type StudentSortKey =
  | 'fullName'
  | 'email'
  | 'firstBookedAt'
  | 'lastBookedAt'
  | 'bookingCount'
  | 'latestBooking'

export const studentSortAccessors: SortAccessorMap<StudentSummary, StudentSortKey> = {
  fullName: (s) => s.fullName,
  email: (s) => s.email,
  firstBookedAt: (s) => s.firstBookedAt ?? '',
  lastBookedAt: (s) => s.lastBookedAt ?? '',
  bookingCount: (s) => s.bookingCount,
  latestBooking: (s) => s.latestBooking?.startTime ?? '',
}

export const studentTableColumns: Array<{ label: string; sortKey: StudentSortKey }> = [
  { label: 'Student', sortKey: 'fullName' },
  { label: 'Email', sortKey: 'email' },
  { label: 'Total Bookings', sortKey: 'bookingCount' },
  { label: 'First Booked', sortKey: 'firstBookedAt' },
  { label: 'Last Booked', sortKey: 'lastBookedAt' },
  { label: 'Latest Interaction', sortKey: 'latestBooking' },
]
