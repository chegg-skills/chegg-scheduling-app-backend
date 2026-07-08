import { describe, it, expect } from 'vitest'
import { deriveSlotStatus, groupBookingsBySlot } from '@/components/bookings/slotUtils'
import type { Booking } from '@/types'

// Helper to create a minimal dummy Booking mock
function makeBooking(id: string, status: Booking['status'], scheduleSlotId?: string | null): Booking {
  return {
    id,
    status,
    studentId: 'student-1',
    scheduleSlotId: scheduleSlotId === undefined ? 'slot-1' : scheduleSlotId,
    studentName: 'John Doe',
    studentEmail: 'john@example.com',
    startTime: '2026-06-25T11:00:00Z',
    endTime: '2026-06-25T12:00:00Z',
    timezone: 'UTC',
    notes: null,
    specificQuestion: null,
    triedSolutions: null,
    usedResources: null,
    sessionObjectives: null,
    customQuestions: [],
    customAnswers: [],
    teamId: 'team-1',
    eventId: 'event-1',
    coachUserId: 'coach-1',
    coCoachUserIds: [],
    meetingJoinUrl: null,
    rescheduleToken: null,
    createdAt: '2026-06-25T10:00:00Z',
    updatedAt: '2026-06-25T10:00:00Z',
  }
}

describe('deriveSlotStatus', () => {
  it('returns CANCELLED when all bookings are cancelled', () => {
    const bookings = [
      makeBooking('b1', 'CANCELLED'),
      makeBooking('b2', 'CANCELLED'),
    ]
    expect(deriveSlotStatus(bookings)).toBe('CANCELLED')
  })

  it('returns CONFIRMED when there is at least one active CONFIRMED or PENDING booking', () => {
    const bookings = [
      makeBooking('b1', 'CONFIRMED'),
      makeBooking('b2', 'NO_SHOW'),
      makeBooking('b3', 'CANCELLED'),
    ]
    expect(deriveSlotStatus(bookings)).toBe('CONFIRMED')
  })

  it('returns COMPLETED when all active bookings are COMPLETED', () => {
    const bookings = [
      makeBooking('b1', 'COMPLETED'),
      makeBooking('b2', 'COMPLETED'),
      makeBooking('b3', 'CANCELLED'),
    ]
    expect(deriveSlotStatus(bookings)).toBe('COMPLETED')
  })

  it('returns COMPLETED when at least one active booking is COMPLETED and the rest are NO_SHOW', () => {
    const bookings = [
      makeBooking('b1', 'COMPLETED'),
      makeBooking('b2', 'NO_SHOW'),
      makeBooking('b3', 'CANCELLED'),
    ]
    expect(deriveSlotStatus(bookings)).toBe('COMPLETED')
  })

  it('returns NO_SHOW when all active bookings are NO_SHOW', () => {
    const bookings = [
      makeBooking('b1', 'NO_SHOW'),
      makeBooking('b2', 'NO_SHOW'),
      makeBooking('b3', 'CANCELLED'),
    ]
    expect(deriveSlotStatus(bookings)).toBe('NO_SHOW')
  })
})

describe('groupBookingsBySlot', () => {
  it('groups standard bookings by slot key', () => {
    const bookings = [
      makeBooking('b1', 'CONFIRMED', 'slot-a'),
      makeBooking('b2', 'CONFIRMED', 'slot-a'),
      makeBooking('b3', 'CONFIRMED', 'slot-b'),
    ]
    const grouped = groupBookingsBySlot(bookings)
    expect(grouped.size).toBe(2)
    expect(grouped.get('slot-a')).toEqual([bookings[0], bookings[1]])
    expect(grouped.get('slot-b')).toEqual([bookings[2]])
  })

  it('uses scheduleSlot.bookings if populated to include all bookings and enriches relations', () => {
    const b1 = makeBooking('b1', 'COMPLETED', 'slot-a')
    const b2 = makeBooking('b2', 'NO_SHOW', 'slot-a')
    
    // Add mock relations to b1
    b1.event = { id: 'event-1', name: 'Mock Event' } as any
    b1.coach = { id: 'coach-1', firstName: 'John' } as any
    b1.team = { id: 'team-1', name: 'Mock Team' } as any

    // Add scheduleSlot with full bookings relation to the first booking
    b1.scheduleSlot = {
      id: 'slot-a',
      eventId: 'event-1',
      startTime: '2026-06-25T11:00:00Z',
      endTime: '2026-06-25T12:00:00Z',
      capacity: 10,
      isActive: true,
      isCancelled: false,
      createdAt: '2026-06-25T10:00:00Z',
      updatedAt: '2026-06-25T10:00:00Z',
      assignedCoachId: 'coach-1',
      assignedCoachOverride: false,
      recurrenceGroupId: null,
      coachRevealSentAt: null,
      sessionJoinUrl: null,
      bookings: [b1, b2],
    }

    // Pass only the completed booking (as would happen on the completed tab)
    const grouped = groupBookingsBySlot([b1])
    expect(grouped.size).toBe(1)
    
    const resultBookings = grouped.get('slot-a')
    expect(resultBookings?.[0]).toBe(b1)
    expect(resultBookings?.[1].id).toBe('b2')
    expect(resultBookings?.[1].event).toEqual(b1.event)
    expect(resultBookings?.[1].coach).toEqual(b1.coach)
    expect(resultBookings?.[1].team).toEqual(b1.team)
  })
})
