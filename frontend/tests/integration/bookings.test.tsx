import { screen, waitFor, fireEvent, cleanup, within } from '@testing-library/react'
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { BookingsPage } from '@/pages/BookingsPage'
import { renderWithProviders } from '../utils/renderWithProviders'
import { http, HttpResponse } from 'msw'
import { server } from '../msw/server'
import { BookFollowUpDialog } from '@/components/bookings/BookFollowUpDialog'
import type { Booking } from '@/types'

const handlers = [
  // Mock Auth API
  http.get('*/api/users/me', () => {
    return HttpResponse.json({
      success: true,
      data: { id: 'admin-1', role: 'TEAM_ADMIN', firstName: 'Admin', lastName: 'User' },
    })
  }),
  http.patch('*/api/bookings/:id', async ({ request, params }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      data: { id: params.id, ...(body as any) },
    })
  }),

  http.get('*/api/v1/stats/bookings', () => {
    return HttpResponse.json({
      success: true,
      data: {
        metrics: { totalBookings: 2, upcomingBookings: 1 },
        timeframe: { label: 'May 2026' },
      },
    })
  }),

  http.get('*/api/bookings', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    // Use real dates relative to "now" to avoid fake timer issues
    const now = new Date()
    const pastDate = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    const futureDate = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()

    let bookings = [
      {
        id: 'booking-1',
        studentName: 'Alice Student',
        studentEmail: 'alice@example.com',
        startTime: futureDate,
        endTime: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        status: 'CONFIRMED',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        event: { name: 'Math Tutoring' },
        coach: { firstName: 'John', lastName: 'Coach' },
      },
      {
        id: 'booking-2',
        studentName: 'Bob Student',
        studentEmail: 'bob@example.com',
        startTime: pastDate,
        endTime: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        status: 'CANCELLED',
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        event: { name: 'Science Lab' },
        coach: { firstName: 'Jane', lastName: 'Coach' },
      },
      {
        id: 'booking-3',
        studentName: 'Charlie Student',
        studentEmail: 'charlie@example.com',
        startTime: pastDate,
        endTime: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        status: 'CONFIRMED',
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        event: { name: 'History' },
        coach: { firstName: 'Mike', lastName: 'Coach' },
      },
    ]

    if (status && status !== 'ALL') {
      if (status === 'UPCOMING') {
        bookings = bookings.filter((b) => b.status === 'CONFIRMED' && new Date(b.startTime) > now)
      } else {
        bookings = bookings.filter((b) => b.status === status)
      }
    }

    return HttpResponse.json({
      success: true,
      data: { bookings, pagination: { total: bookings.length } },
    })
  }),

  http.patch('*/api/bookings/:id/status', () => {
    return HttpResponse.json({ success: true })
  }),

  http.get('*/api/v1/bookings/:id/timeline', () => {
    return HttpResponse.json({
      success: true,
      data: { timeline: [] },
    })
  }),

  http.get('*/api/bookings/:id/log', () => {
    return HttpResponse.json({
      success: true,
      data: { logs: [] },
    })
  }),
]

describe('Bookings Domain Integration', () => {
  beforeEach(() => {
    server.use(...handlers)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('should display bookings and allow tab switching', async () => {
    renderWithProviders(<BookingsPage />)

    // 1. Initial State (Upcoming/Confirmed)
    await waitFor(
      () => {
        expect(screen.getByText('Alice Student')).toBeInTheDocument()
      },
      { timeout: 8000 }
    )

    expect(screen.queryByText('Bob Student')).not.toBeInTheDocument()

    // 2. Switch to Cancelled Tab
    const cancelledTab = screen.getByRole('tab', { name: /Cancelled/i })
    fireEvent.click(cancelledTab)

    await waitFor(
      () => {
        expect(screen.getByText('Bob Student')).toBeInTheDocument()
      },
      { timeout: 8000 }
    )
    expect(screen.queryByText('Alice Student')).not.toBeInTheDocument()
  }, 15000)

  it('should allow expanding a booking and marking as No-show', async () => {
    renderWithProviders(<BookingsPage />)

    // Wait for data
    await screen.findByText('Alice Student', {}, { timeout: 8000 })

    // 1. Switch to "All" to see the past booking (Charlie)
    const allTab = screen.getByRole('tab', { name: /All/i })
    fireEvent.click(allTab)

    await screen.findByText('Charlie Student', {}, { timeout: 8000 })

    // 2. Find and expand Charlie's booking using accessible button selector
    const charlieCell = await screen.findByText('Charlie Student')
    const charlieRow = charlieCell.closest('tr')
    if (!charlieRow) throw new Error('Charlie row not found')
    const detailsButton = within(charlieRow).getByRole('button', { name: /Details/i })
    fireEvent.click(detailsButton)

    // 3. Mark as No-show
    const noShowButton = await screen.findByRole(
      'button',
      { name: /Mark as No Show/i },
      { timeout: 8000 }
    )
    fireEvent.click(noShowButton)

    // 4. Verify Modal appears
    expect(screen.getByText(/Are you sure you want to no show the booking/i)).toBeInTheDocument()

    // 5. Confirm action (dialog defaults to "Yes" when no confirmText is passed)
    const confirmButton = screen.getByRole('button', { name: /^Yes$/i })
    fireEvent.click(confirmButton)
  }, 15000)

  it('should display the orange dot on follow-up calendar days with available slots', async () => {
    // 1. Set up a completed booking object
    const completedBooking: Booking = {
      id: 'booking-completed',
      studentId: 'student-1',
      scheduleSlotId: null,
      studentName: 'Charlie Student',
      studentEmail: 'charlie@example.com',
      startTime: '2026-06-25T10:30:00Z',
      endTime: '2026-06-25T11:00:00Z',
      timezone: 'UTC',
      status: 'COMPLETED',
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
      createdAt: '2026-06-24T10:30:00Z',
      updatedAt: '2026-06-24T10:30:00Z',
      event: {
        id: 'event-1',
        name: 'History',
        bookingMode: 'FIXED_SLOTS',
        useDefaultQuestions: true,
        customQuestions: [],
        description: null,
        isActive: true,
        durationSeconds: 1800,
        bufferAfterMinutes: 0,
        minimumNoticeMinutes: 0,
        maxParticipantCount: null,
        sessionLeadershipStrategy: 'SINGLE_COACH',
        fixedLeadCoachId: null,
        targetCoHostCount: null,
        allowAnonymousBooking: false,
        eventTypeId: 'type-1',
        meetingLinkSource: 'COACH_ISV',
        allowStudentCoachChoice: false,
        maxBookingWindowDays: 30,
        showDescription: true,
        deferCoachReveal: false,
        locationType: 'VIRTUAL',
        locationValue: '',
        teamId: 'team-1',
        createdById: 'admin-1',
        updatedById: 'admin-1',
        publicBookingSlug: 'history-session',
        interactionType: 'ONE_TO_MANY',
        assignmentStrategy: 'ROUND_ROBIN',
        groupId: null,
        locationLinkExpiresAt: null,
        locationLinkReminderDays: null,
        eventType: { id: 'type-1', key: 'tutoring', name: 'Tutoring', description: null, isActive: true, sortOrder: 0, createdById: 'admin-1', updatedById: 'admin-1', createdAt: '2026-06-24T10:30:00Z', updatedAt: '2026-06-24T10:30:00Z' },
        coaches: [],
        createdAt: '2026-06-24T10:30:00Z',
        updatedAt: '2026-06-24T10:30:00Z',
      },
      coach: {
        id: 'coach-1',
        firstName: 'Mike',
        lastName: 'Coach',
        email: 'mike@example.com',
        avatarUrl: null,
        role: 'COACH',
        timezone: 'UTC',
        publicBookingSlug: null,
        phoneNumber: null,
        country: null,
        preferredLanguage: null,
        zoomIsvLink: null,
        zoomIsvLinkExpiresAt: null,
        zoomIsvLinkReminderDays: null,
        isActive: true,
        lastLoginAt: null,
        ssoLinkedAt: null,
        createdAt: '2026-06-24T10:30:00Z',
        updatedAt: '2026-06-24T10:30:00Z',
      }
    }

    // 2. Setup mock response for public slot dates for this event
    server.use(
      http.get('*/api/public/events/event-1/slots', () => {
        return HttpResponse.json({
          success: true,
          data: {
            slots: [
              {
                startTime: '2026-06-28T10:30:00.000Z',
                endTime: '2026-06-28T11:00:00.000Z',
                scheduleSlotId: 'slot-1',
                assignedCoach: {
                  id: 'coach-1',
                  firstName: 'Mike',
                  lastName: 'Coach',
                  avatarUrl: null,
                },
              },
            ],
          },
        })
      }),
      http.get('*/api/system-settings/booking-questions', () => {
        return HttpResponse.json({
          success: true,
          data: { questions: [] },
        })
      })
    )

    // 3. Render BookFollowUpDialog
    renderWithProviders(
      <BookFollowUpDialog
        isOpen={true}
        booking={completedBooking}
        onClose={() => {}}
      />
    )

    // 4. Verify slots are fetched and the orange dot renders on June 28th
    // Locate the calendar cell for June 28, 2026
    await waitFor(() => {
      const dayCell = screen.getByRole('gridcell', { name: '28' })
      expect(dayCell).toBeInTheDocument()
      
      // Let's verify the dot is rendered. Our makeSlotDayIndicator wraps the button
      // and placing the dot sibling. So the parent of the button has the dot.
      const dayContainer = dayCell.parentElement
      expect(dayContainer).toBeInTheDocument()
      
      // Find the slot-indicator-dot inside the day container
      const dot = within(dayContainer!).getByTestId('slot-indicator-dot')
      expect(dot).toBeInTheDocument()
    }, { timeout: 8000 })
  }, 15000)
})
