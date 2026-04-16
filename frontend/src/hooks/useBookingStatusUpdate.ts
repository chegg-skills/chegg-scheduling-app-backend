import { toTitleCase } from '@/utils/toTitleCase'
import type { Booking, BookingStatus } from '@/types'
import { useAsyncAction } from './useAsyncAction'
import { useUpdateBookingStatus } from './queries/useBookings'

export function useBookingStatusUpdate() {
  const { handleAction } = useAsyncAction()
  const { mutate: updateStatus } = useUpdateBookingStatus()

  const handleStatusUpdate = (booking: Booking, status: BookingStatus, label: string) => {
    handleAction(
      ({ id, status: nextStatus }: { id: string; status: BookingStatus }) =>
        updateStatus({ id, status: nextStatus }),
      { id: booking.id, status },
      {
        title: `${label} Booking`,
        message: `Are you sure you want to ${label.toLowerCase()} the booking for ${toTitleCase(booking.studentName)}?`,
        actionName: label,
      }
    )
  }

  const canMarkNoShow = (booking: Booking): boolean => {
    const startTime = new Date(booking.startTime)
    const tenMinutesAfterStart = new Date(startTime.getTime() + 10 * 60 * 1000)
    return booking.status === 'CONFIRMED' && new Date() >= tenMinutesAfterStart
  }

  return { handleStatusUpdate, canMarkNoShow }
}
