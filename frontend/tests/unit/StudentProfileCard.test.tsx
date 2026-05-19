import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StudentProfileCard } from '@/components/students/StudentProfileCard'
import type { StudentSummary, Booking, SafeUser, Event } from '@/types'
import { renderWithProviders } from '../utils/renderWithProviders'

const mockStudent: StudentSummary = {
  id: 'student-123',
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  firstBookedAt: '2026-05-10T10:00:00.000Z',
  lastBookedAt: '2026-05-19T10:00:00.000Z',
  createdAt: '2026-05-10T10:00:00.000Z',
  updatedAt: '2026-05-19T10:00:00.000Z',
  bookingCount: 3,
  latestBooking: null,
}

const mockCoachAlice = {
  id: 'coach-alice',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice.smith@example.com',
  avatarUrl: null,
  role: 'COACH' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as SafeUser

const mockCoachBob = {
  id: 'coach-bob',
  firstName: 'Bob',
  lastName: 'Johnson',
  email: 'bob.johnson@example.com',
  avatarUrl: null,
  role: 'COACH' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as SafeUser

const mockVirtualEvent = {
  id: 'event-1',
  name: 'React Basics',
  description: 'React overview',
  duration: 60,
  locationType: 'VIRTUAL' as const,
  locationDetails: 'Zoom Link',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  teamId: 'team-1',
  hosts: [],
  coHosts: [],
  publicBookingSlug: 'react-basics',
} as unknown as Event

const mockInPersonEvent = {
  id: 'event-2',
  name: 'Database Architecture',
  description: 'DB design overview',
  duration: 90,
  locationType: 'IN_PERSON' as const,
  locationDetails: 'Chegg HQ Room 101',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  teamId: 'team-1',
  hosts: [],
  coHosts: [],
  publicBookingSlug: 'db-architecture',
} as unknown as Event

describe('StudentProfileCard', () => {
  it('renders student name, email, avatar, and registration date correctly', () => {
    renderWithProviders(<StudentProfileCard student={mockStudent} bookings={[]} />)

    expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument()
    expect(screen.getAllByText('john.doe@example.com')[0]).toBeInTheDocument()
    expect(screen.getAllByText('JD')[0]).toBeInTheDocument() // Initials
    expect(screen.getAllByText('May 10, 2026')[0]).toBeInTheDocument() // Formatted Member Since date
  })

  it('handles empty booking history gracefully', () => {
    renderWithProviders(<StudentProfileCard student={mockStudent} bookings={[]} />)

    // Timezone should default to UTC
    expect(screen.getAllByText('UTC')[0]).toBeInTheDocument()

    // Preferred Learning Mode should show empty message
    expect(screen.getAllByText('No bookings yet')[0]).toBeInTheDocument()

    // Favorite Coach should show N/A
    expect(screen.getAllByText('N/A')[0]).toBeInTheDocument()
  })

  it('calculates and displays Favorite Coach based on maximum session tallies', () => {
    const bookings: Booking[] = [
      {
        id: 'booking-1',
        studentName: 'John Doe',
        studentEmail: 'john.doe@example.com',
        teamId: 'team-1',
        eventId: 'event-1',
        startTime: '2026-05-18T10:00:00.000Z',
        endTime: '2026-05-18T11:00:00.000Z',
        timezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
        createdAt: '2026-05-18T09:00:00.000Z',
        updatedAt: '2026-05-18T09:00:00.000Z',
        coachUserId: 'coach-alice',
        coach: mockCoachAlice,
        event: mockVirtualEvent,
      },
      {
        id: 'booking-2',
        studentName: 'John Doe',
        studentEmail: 'john.doe@example.com',
        teamId: 'team-1',
        eventId: 'event-1',
        startTime: '2026-05-19T10:00:00.000Z',
        endTime: '2026-05-19T11:00:00.000Z',
        timezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
        createdAt: '2026-05-19T09:00:00.000Z',
        updatedAt: '2026-05-19T09:00:00.000Z',
        coachUserId: 'coach-alice',
        coach: mockCoachAlice,
        event: mockVirtualEvent,
      },
      {
        id: 'booking-3',
        studentName: 'John Doe',
        studentEmail: 'john.doe@example.com',
        teamId: 'team-1',
        eventId: 'event-2',
        startTime: '2026-05-19T14:00:00.000Z',
        endTime: '2026-05-19T15:30:00.000Z',
        timezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
        createdAt: '2026-05-19T11:00:00.000Z',
        updatedAt: '2026-05-19T11:00:00.000Z',
        coachUserId: 'coach-bob',
        coach: mockCoachBob,
        event: mockInPersonEvent,
      },
    ]

    renderWithProviders(<StudentProfileCard student={mockStudent} bookings={bookings} />)

    // Alice Smith has 2 bookings, Bob Johnson has 1 booking. Alice Smith should be favorite.
    expect(screen.getAllByText('Alice Smith (2 sessions)')[0]).toBeInTheDocument()
  })

  it('determines the preferred Learning Mode based on majority booking locationType', () => {
    // Test Case 1: Majority Virtual Bookings
    const virtualBookings: Booking[] = [
      {
        id: 'booking-1',
        studentName: 'John Doe',
        studentEmail: 'john.doe@example.com',
        teamId: 'team-1',
        eventId: 'event-1',
        startTime: '2026-05-18T10:00:00.000Z',
        endTime: '2026-05-18T11:00:00.000Z',
        timezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
        createdAt: '2026-05-18T09:00:00.000Z',
        updatedAt: '2026-05-18T09:00:00.000Z',
        coachUserId: 'coach-alice',
        coach: mockCoachAlice,
        event: mockVirtualEvent,
      },
      {
        id: 'booking-2',
        studentName: 'John Doe',
        studentEmail: 'john.doe@example.com',
        teamId: 'team-1',
        eventId: 'event-1',
        startTime: '2026-05-19T10:00:00.000Z',
        endTime: '2026-05-19T11:00:00.000Z',
        timezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
        createdAt: '2026-05-19T09:00:00.000Z',
        updatedAt: '2026-05-19T09:00:00.000Z',
        coachUserId: 'coach-alice',
        coach: mockCoachAlice,
        event: mockVirtualEvent,
      },
      {
        id: 'booking-3',
        studentName: 'John Doe',
        studentEmail: 'john.doe@example.com',
        teamId: 'team-1',
        eventId: 'event-2',
        startTime: '2026-05-19T14:00:00.000Z',
        endTime: '2026-05-19T15:30:00.000Z',
        timezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
        createdAt: '2026-05-19T11:00:00.000Z',
        updatedAt: '2026-05-19T11:00:00.000Z',
        coachUserId: 'coach-bob',
        coach: mockCoachBob,
        event: mockInPersonEvent,
      },
    ]

    const { unmount } = renderWithProviders(
      <StudentProfileCard student={mockStudent} bookings={virtualBookings} />
    )
    expect(screen.getAllByText('Virtual (Video Call)')[0]).toBeInTheDocument()
    unmount()

    // Test Case 2: Majority In-Person Bookings
    const inPersonBookings: Booking[] = [
      {
        id: 'booking-1',
        studentName: 'John Doe',
        studentEmail: 'john.doe@example.com',
        teamId: 'team-1',
        eventId: 'event-1',
        startTime: '2026-05-18T10:00:00.000Z',
        endTime: '2026-05-18T11:00:00.000Z',
        timezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
        createdAt: '2026-05-18T09:00:00.000Z',
        updatedAt: '2026-05-18T09:00:00.000Z',
        coachUserId: 'coach-alice',
        coach: mockCoachAlice,
        event: mockVirtualEvent,
      },
      {
        id: 'booking-2',
        studentName: 'John Doe',
        studentEmail: 'john.doe@example.com',
        teamId: 'team-1',
        eventId: 'event-2',
        startTime: '2026-05-19T10:00:00.000Z',
        endTime: '2026-05-19T11:30:00.000Z',
        timezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
        createdAt: '2026-05-19T09:00:00.000Z',
        updatedAt: '2026-05-19T09:00:00.000Z',
        coachUserId: 'coach-bob',
        coach: mockCoachBob,
        event: mockInPersonEvent,
      },
      {
        id: 'booking-3',
        studentName: 'John Doe',
        studentEmail: 'john.doe@example.com',
        teamId: 'team-1',
        eventId: 'event-2',
        startTime: '2026-05-19T14:00:00.000Z',
        endTime: '2026-05-19T15:30:00.000Z',
        timezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
        createdAt: '2026-05-19T11:00:00.000Z',
        updatedAt: '2026-05-19T11:00:00.000Z',
        coachUserId: 'coach-bob',
        coach: mockCoachBob,
        event: mockInPersonEvent,
      },
    ]

    renderWithProviders(<StudentProfileCard student={mockStudent} bookings={inPersonBookings} />)
    expect(screen.getAllByText('In-Person Session')[0]).toBeInTheDocument()
  })

  it('displays the timezone associated with the latest booking', () => {
    const bookings: Booking[] = [
      {
        id: 'booking-latest',
        studentName: 'John Doe',
        studentEmail: 'john.doe@example.com',
        teamId: 'team-1',
        eventId: 'event-1',
        startTime: '2026-05-19T10:00:00.000Z',
        endTime: '2026-05-19T11:00:00.000Z',
        timezone: 'America/New_York',
        status: 'CONFIRMED',
        createdAt: '2026-05-19T09:00:00.000Z',
        updatedAt: '2026-05-19T09:00:00.000Z',
        coachUserId: 'coach-alice',
        coach: mockCoachAlice,
        event: mockVirtualEvent,
      },
      {
        id: 'booking-older',
        studentName: 'John Doe',
        studentEmail: 'john.doe@example.com',
        teamId: 'team-1',
        eventId: 'event-1',
        startTime: '2026-05-18T10:00:00.000Z',
        endTime: '2026-05-18T11:00:00.000Z',
        timezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
        createdAt: '2026-05-18T09:00:00.000Z',
        updatedAt: '2026-05-18T09:00:00.000Z',
        coachUserId: 'coach-alice',
        coach: mockCoachAlice,
        event: mockVirtualEvent,
      },
    ]

    renderWithProviders(<StudentProfileCard student={mockStudent} bookings={bookings} />)

    // Should display America/New_York (timezone of first/latest booking in history)
    expect(screen.getAllByText('America/New_York')[0]).toBeInTheDocument()
  })
})
