import type { Booking, BookingStatus } from '@/types'

/**
 * Derives a single representative status for a slot from its student bookings.
 * - All cancelled → CANCELLED
 * - All non-cancelled are completed → COMPLETED
 * - Any no-show among completed → NO_SHOW
 * - Otherwise → CONFIRMED (session is active / upcoming)
 */
export function deriveSlotStatus(bookings: Booking[]): BookingStatus {
  const active = bookings.filter((b) => b.status !== 'CANCELLED')
  if (active.length === 0) return 'CANCELLED'
  
  // If there are any CONFIRMED or PENDING bookings, the session is still active / upcoming
  if (active.some((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')) return 'CONFIRMED'
  
  // If all active bookings are resolved (either COMPLETED or NO_SHOW)
  if (active.every((b) => b.status === 'COMPLETED' || b.status === 'NO_SHOW')) {
    // If at least one attendee showed up and booking was completed, the slot is COMPLETED
    if (active.some((b) => b.status === 'COMPLETED')) {
      return 'COMPLETED'
    }
    // If everyone is marked as absent, it's NO_SHOW
    return 'NO_SHOW'
  }
  
  return 'CONFIRMED'
}

/**
 * Groups an array of bookings by scheduleSlotId.
 * Returns a Map so iteration order (insertion order) is preserved.
 * Bookings without a scheduleSlotId are keyed by their own id.
 */
export function groupBookingsBySlot(bookings: Booking[]): Map<string, Booking[]> {
  const map = new Map<string, Booking[]>()
  
  // 1. Group bookings by scheduleSlotId / booking ID
  for (const b of bookings) {
    const key = b.scheduleSlotId ?? b.id
    const group = map.get(key)
    if (group) {
      if (!group.some((existing) => existing.id === b.id)) {
        group.push(b)
      }
    } else {
      map.set(key, [b])
    }
  }

  // 2. Override groups with scheduleSlot.bookings if populated on any of the group's bookings
  for (const [key, group] of map.entries()) {
    const rep = group.find((b) => b.scheduleSlot?.bookings && b.scheduleSlot.bookings.length > 0)
    if (rep && rep.scheduleSlot?.bookings) {
      const enriched = rep.scheduleSlot.bookings.map((slotBooking) => {
        const existing = group.find((g) => g.id === slotBooking.id)
        if (existing) {
          return existing
        }
        return {
          ...slotBooking,
          event: rep.event,
          coach: rep.coach,
          team: rep.team,
        }
      })
      map.set(key, enriched)
    }
  }

  return map
}
