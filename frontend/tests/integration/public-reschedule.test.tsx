import { screen, waitFor, cleanup } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { PublicReschedulePage } from '@/pages/public/PublicReschedulePage'
import { renderWithProviders } from '../utils/renderWithProviders'
import { http, HttpResponse } from 'msw'
import { server } from '../msw/server'
import { startOfDayInTimezone } from '@/utils/dateTimezone'

// PublicReschedulePage calls useOutletContext to get setFramed from its parent layout.
// In tests there is no outlet — mock it to return a no-op so the component renders.
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...(actual as object),
    useOutletContext: () => ({ setFramed: vi.fn() }),
  }
})

const BOOKING_ID = 'booking-abc-123'
const RESCHEDULE_TOKEN = 'valid-reschedule-token'

const mockBooking = {
  id: BOOKING_ID,
  studentEmail: 'student@example.com',
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  eventId: 'event-xyz-456',
  status: 'CONFIRMED',
  event: {
    id: 'event-xyz-456',
    name: 'Career Coaching Session',
  },
  coach: {
    id: 'coach-001',
    firstName: 'Jane',
    lastName: 'Smith',
  },
}

const successHandlers = [
  http.get('*/api/public/bookings/:id', () =>
    HttpResponse.json({ success: true, data: { booking: mockBooking } })
  ),
  http.get('*/api/public/events/*/slots', () =>
    HttpResponse.json({ success: true, data: { slots: [] } })
  ),
]

function renderReschedulePage(search = `?token=${RESCHEDULE_TOKEN}`) {
  return renderWithProviders(
    <Routes>
      <Route path="/reschedule/:bookingId" element={<PublicReschedulePage />} />
    </Routes>,
    { initialEntries: [`/reschedule/${BOOKING_ID}${search}`] }
  )
}

describe('PublicReschedulePage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    server.use(...successHandlers)
  })

  afterEach(() => {
    cleanup()
    server.resetHandlers()
  })

  it('renders the reschedule UI after the booking loads', async () => {
    renderReschedulePage()
    // The heading appears in both the sidebar and mobile header — use getAllByText
    await waitFor(() => {
      const headings = screen.getAllByText(/reschedule your current session/i)
      expect(headings.length).toBeGreaterThan(0)
    })
  })

  it('shows the event name once the booking loads', async () => {
    renderReschedulePage()
    // "Career Coaching Session" is rendered in the booking summary strip
    await waitFor(() => {
      const matches = screen.getAllByText(/career coaching session/i)
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  it('shows an error state (back-to-homepage button) when the booking API returns 404', async () => {
    server.use(
      http.get('*/api/public/bookings/:id', () =>
        HttpResponse.json({ success: false, message: 'Booking not found.' }, { status: 404 })
      )
    )
    renderReschedulePage()
    // The error branch always renders a "Back to homepage" button
    await waitFor(() => expect(screen.getByText(/back to homepage/i)).toBeTruthy(), {
      timeout: 3000,
    })
  })

  it('shows a missing-token error when no token is in the URL', async () => {
    // With no token in URL and no sessionStorage token, the query is disabled —
    // the page renders the error branch once the initial pending state clears.
    renderReschedulePage('') // no query string → token = ''
    await waitFor(() => expect(screen.getByText(/token is missing/i)).toBeTruthy())
  })

  it('sends timezone-aware startDate/endDate to the slots API', async () => {
    let capturedUrl: URL | null = null

    server.use(
      http.get('*/api/public/bookings/:id', () =>
        HttpResponse.json({ success: true, data: { booking: mockBooking } })
      ),
      http.get('*/api/public/events/*/slots', ({ request }) => {
        capturedUrl = new URL(request.url)
        return HttpResponse.json({ success: true, data: { slots: [] } })
      })
    )

    renderReschedulePage()

    await waitFor(() => {
      expect(capturedUrl).not.toBeNull()
    })

    const startDate = capturedUrl!.searchParams.get('startDate')
    const endDate = capturedUrl!.searchParams.get('endDate')

    // Both params must be present and parseable as ISO dates.
    expect(startDate).not.toBeNull()
    expect(endDate).not.toBeNull()
    expect(Number.isNaN(new Date(startDate!).getTime())).toBe(false)
    expect(Number.isNaN(new Date(endDate!).getTime())).toBe(false)

    // The startDate must be midnight in the component's default timezone (browser tz in jsdom = UTC).
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const today = new Date()
    const expectedStart = startOfDayInTimezone(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      browserTz
    )
    expect(new Date(startDate!).getTime()).toBe(expectedStart.getTime())
  })
})
