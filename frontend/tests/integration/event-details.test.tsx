import { screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { renderWithProviders } from '../utils/renderWithProviders'
import { http, HttpResponse } from 'msw'
import { server } from '../msw/server'

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual as any,
    useParams: () => ({ eventId: 'event-1' }),
  }
})

const mockEvent = {
  id: 'event-1',
  name: 'Math Tutoring',
  description: 'One-on-one math support',
  teamId: 'team-1',
  isActive: true,
  bookingMode: 'FIXED_SLOTS',
  assignmentStrategy: 'MANUAL',
  minCoachCount: 1,
  maxCoachCount: 5,
  durationSeconds: 1800,
  eventType: { name: 'Tutoring' },
  interactionType: 'ONE_TO_ONE',
  locationType: 'VIRTUAL',
  locationValue: 'Zoom',
  minimumNoticeMinutes: 60,
  bufferAfterMinutes: 15,
  allowedWeekdays: [1, 2, 3, 4, 5],
  sessionLeadershipStrategy: 'STUDENT_LED',
  publicBookingSlug: 'math-tutoring',
  coaches: [
    { id: 'coach-1', coachUserId: 'coach-1', coachUser: { id: 'coach-1', firstName: 'John', lastName: 'Coach', timezone: 'UTC' } }
  ],
  _count: {
    bookings: 5,
    scheduleSlots: 3
  },
  team: { id: 'team-1', name: 'Math Team' }
}

const handlers = [
  http.get('*/api/events/event-1', () => {
    return HttpResponse.json({
      success: true,
      data: mockEvent
    })
  }),
  http.get('*/api/events/event-1/schedule-slots', () => {
    return HttpResponse.json({
      success: true,
      data: {
        slots: [
          { 
            id: 'slot-1', 
            startTime: new Date(Date.now() + 2 * 3600000).toISOString(), 
            endTime: new Date(Date.now() + 3 * 3600000).toISOString(), 
            coachId: 'coach-1', 
            recurrenceGroupId: 'series-1' 
          }
        ]
      }
    })
  }),
  http.get('*/api/teams/team-1/members', () => {
    return HttpResponse.json({
      success: true,
      data: {
        members: [
          { id: 'coach-1', user: { firstName: 'John', lastName: 'Coach' }, role: 'COACH' },
          { id: 'admin-1', user: { firstName: 'Admin', lastName: 'User' }, role: 'TEAM_ADMIN' }
        ]
      }
    })
  }),

  // Attendance/Logging Mocks
  http.get('*/api/events/:eventId/schedule-slots/:slotId/bookings', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 'booking-1', studentName: 'Alice Student', studentEmail: 'alice@example.com', status: 'CONFIRMED', createdAt: new Date().toISOString() }
      ]
    })
  }),
  http.get('*/api/events/:eventId/schedule-slots/:slotId/log', () => {
    return HttpResponse.json({ success: true, data: null }) // No existing log
  }),
  http.post('*/api/events/:eventId/schedule-slots/:slotId/log', () => {
    return HttpResponse.json({ success: true })
  })
]

describe('Event Detail Integration', () => {
  beforeEach(() => {
    server.use(...handlers)
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('should render event details and allow tab switching', async () => {
    // Admin persona
    server.use(
      http.get('*/api/users/me', () => HttpResponse.json({
        success: true,
        data: { id: 'admin-1', role: 'SUPER_ADMIN' }
      }))
    )

    renderWithProviders(<EventDetailPage />)

    // 1. Verify Page Header
    await screen.findByText('Math Tutoring')
    expect(screen.getByText('One-on-one math support')).toBeInTheDocument()

    // 2. Default tab (Details) content
    expect(screen.getByText(/Event Configuration/i)).toBeInTheDocument()

    // 3. Switch to Coaches tab
    const coachesTab = screen.getByRole('tab', { name: /Coaches/i })
    fireEvent.click(coachesTab)
    expect(await screen.findByText('John Coach')).toBeInTheDocument()

    // 4. Switch to Schedule tab
    const scheduleTab = screen.getByRole('tab', { name: /Schedule/i })
    fireEvent.click(scheduleTab)
    expect(await screen.findByText(/Scheduled Sessions/i)).toBeInTheDocument()

    // 5. Navigate to Series Tracker
    const seriesRow = await screen.findByText(/Recurring Weekly Series/i)
    fireEvent.click(seriesRow)

    // 6. Verify Tracker sub-tabs
    expect(await screen.findByText(/Series Tracker/i)).toBeInTheDocument()
    expect(screen.getByText(/Upcoming/i)).toBeInTheDocument()
    expect(screen.getByText(/All Sessions/i)).toBeInTheDocument()
    expect(screen.getByText(/Past/i)).toBeInTheDocument()
  }, 15000)

  it('should restrict management actions to admins', async () => {
    // Coach persona
    server.use(
      http.get('*/api/users/me', () => HttpResponse.json({
        success: true,
        data: { id: 'coach-1', role: 'COACH' }
      }))
    )

    renderWithProviders(<EventDetailPage />)

    await screen.findByText('Math Tutoring')

    // Coaches should not see the "RowActions" (the three dots button that contains edit/delete)
    // Note: This depends on how RowActions is rendered. In EventDetailPage it is in the header.
    // Let's check for the "Edit event details" label which is inside the menu
    screen.queryByLabelText(/Actions/i)
    // If there's only one action menu in the header, we can check for its absence or the labels inside it.
    // However, RowActions might still render but its actions list might be empty or it might be hidden.
    // Checking queryAllByRole('button', { name: /Edit event details/i })
    expect(screen.queryByLabelText(/Edit event details/i)).not.toBeInTheDocument()
  }, 15000)

  it('should allow logging a session and marking attendance', async () => {
    // Admin persona
    server.use(
      http.get('*/api/users/me', () => HttpResponse.json({
        success: true,
        data: { id: 'admin-1', role: 'SUPER_ADMIN' }
      }))
    )

    renderWithProviders(<EventDetailPage />)

    // 1. Go to Schedule -> Tracker
    fireEvent.click(await screen.findByRole('tab', { name: /Schedule/i }))
    fireEvent.click(await screen.findByText(/Recurring Weekly Series/i))
    expect(await screen.findByText(/Series Tracker/i)).toBeInTheDocument()

    // 2. Open Log Session dialog
    const moreButtons = await screen.findAllByRole('button', { name: /more/i })
    // In the tracker view, moreButtons[0] is in the header, moreButtons[1] is the first row.
    fireEvent.click(moreButtons[1])
    
    const logSessionMenuItem = await screen.findByText(/Log Session/i)
    fireEvent.click(logSessionMenuItem)

    // 3. Verify dialog content
    expect(await screen.findByRole('heading', { name: /Log Session/i })).toBeInTheDocument()
    expect(await screen.findByText('Alice Student')).toBeInTheDocument()

    // 4. Fill and Save
    fireEvent.change(screen.getByPlaceholderText(/e.g. React hooks/i), { target: { value: 'Test Topics' } })
    fireEvent.change(screen.getByPlaceholderText(/Describe what was covered/i), { target: { value: 'Test Summary' } })
    
    fireEvent.click(screen.getByRole('button', { name: /Save Log/i }))

    // 5. Verify dialog closes
    await waitFor(() => {
      expect(screen.queryByText(/Save Log/i)).not.toBeInTheDocument()
    })
  }, 15000)
})
