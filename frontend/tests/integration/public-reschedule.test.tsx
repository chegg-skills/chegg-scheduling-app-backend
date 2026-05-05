import { screen, waitFor, cleanup } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { PublicReschedulePage } from '@/pages/public/PublicReschedulePage'
import { renderWithProviders } from '../utils/renderWithProviders'
import { http, HttpResponse } from 'msw'
import { server } from '../msw/server'

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
        HttpResponse.json(
          { success: false, message: 'Booking not found.' },
          { status: 404 }
        )
      )
    )
    renderReschedulePage()
    // The error branch always renders a "Back to homepage" button
    await waitFor(
      () => expect(screen.getByText(/back to homepage/i)).toBeTruthy(),
      { timeout: 3000 }
    )
  })

  it('shows a missing-token error when no token is in the URL', () => {
    // With no token, the query is disabled (enabled = false) — no fetch fires.
    // The page immediately renders the error branch with a specific message.
    renderReschedulePage('') // no query string → token = ''
    expect(screen.getByText(/token is missing/i)).toBeTruthy()
  })
})
