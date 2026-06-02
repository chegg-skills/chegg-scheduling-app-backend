import { screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { PublicCancelPage } from '@/pages/public/PublicCancelPage'
import { renderWithProviders } from '../utils/renderWithProviders'
import { http, HttpResponse } from 'msw'
import { server } from '../msw/server'

// Mock react-router-dom outlet context setFramed
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...(actual as object),
    useOutletContext: () => ({ setFramed: vi.fn() }),
  }
})

const BOOKING_ID = 'booking-abc-123'
const CANCEL_TOKEN = 'valid-cancel-token'

const mockBooking = {
  id: BOOKING_ID,
  studentEmail: 'student@example.com',
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  eventId: 'event-xyz-456',
  status: 'CONFIRMED',
  timezone: 'America/New_York',
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
  http.post('*/api/bookings/:id/cancel', () =>
    HttpResponse.json({ success: true, data: { booking: { ...mockBooking, status: 'CANCELLED' } } })
  ),
]

function renderCancelPage(search = `?token=${CANCEL_TOKEN}`) {
  return renderWithProviders(
    <Routes>
      <Route path="/cancel/:bookingId" element={<PublicCancelPage />} />
    </Routes>,
    { initialEntries: [`/cancel/${BOOKING_ID}${search}`] }
  )
}

describe('PublicCancelPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    server.use(...successHandlers)
  })

  afterEach(() => {
    cleanup()
    server.resetHandlers()
  })

  it('renders the cancellation options UI after the booking loads', async () => {
    renderCancelPage()
    await waitFor(() => {
      const headings = screen.getAllByText(/cancel your session/i)
      expect(headings.length).toBeGreaterThan(0)
      expect(screen.getByText(/please choose your preferred cancellation reason/i)).toBeTruthy()
    })
  })

  it('shows the event name and details in the summary', async () => {
    renderCancelPage()
    await waitFor(() => {
      const matches = screen.getAllByText(/career coaching session/i)
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  it('submits cancellation with a predefined option and shows the success screen', async () => {
    let capturedBody: any = null

    server.use(
      http.post('*/api/bookings/:id/cancel', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({
          success: true,
          data: { booking: { ...mockBooking, status: 'CANCELLED' } },
        })
      })
    )

    renderCancelPage()

    // Find and click a predefined option
    await waitFor(() => {
      expect(screen.getByText(/schedule conflict \/ need to reschedule/i)).toBeTruthy()
    })
    const radioOption = screen.getByText(/schedule conflict \/ need to reschedule/i)
    fireEvent.click(radioOption)

    // Click confirm button in footer
    const confirmButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.toLowerCase() === 'confirm cancellation')
    expect(confirmButton).toBeTruthy()
    fireEvent.click(confirmButton!)

    // Wait for success screen
    await waitFor(() => {
      expect(screen.getByText(/session cancelled/i)).toBeTruthy()
    })

    expect(capturedBody).toEqual({
      token: CANCEL_TOKEN,
      cancellationReason: 'Schedule conflict / Need to reschedule',
    })
  })

  it('submits cancellation with a custom reason (Other option) and shows success screen', async () => {
    let capturedBody: any = null

    server.use(
      http.post('*/api/bookings/:id/cancel', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({
          success: true,
          data: { booking: { ...mockBooking, status: 'CANCELLED' } },
        })
      })
    )

    renderCancelPage()

    // Click "Other" option
    await waitFor(() => {
      expect(screen.getByText(/other \(please specify below\)/i)).toBeTruthy()
    })
    const otherOption = screen.getByText(/other \(please specify below\)/i)
    fireEvent.click(otherOption)

    // Fill specify reason field
    await waitFor(() => {
      expect(screen.getByLabelText(/please specify your reason/i)).toBeTruthy()
    })
    const reasonInput = screen.getByLabelText(/please specify your reason/i)
    fireEvent.change(reasonInput, { target: { value: 'Unexpected emergency' } })

    // Click cancel button
    const confirmButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.toLowerCase() === 'confirm cancellation')
    expect(confirmButton).toBeTruthy()
    fireEvent.click(confirmButton!)

    // Wait for success screen
    await waitFor(() => {
      expect(screen.getByText(/session cancelled/i)).toBeTruthy()
    })

    expect(capturedBody).toEqual({
      token: CANCEL_TOKEN,
      cancellationReason: 'Unexpected emergency',
    })
  })

  it('shows already cancelled view if status is 409 Conflict', async () => {
    server.use(
      http.get('*/api/public/bookings/:id', () =>
        HttpResponse.json({ success: false, message: 'Already cancelled.' }, { status: 409 })
      )
    )

    renderCancelPage()

    await waitFor(() => {
      expect(screen.getByText(/already cancelled/i)).toBeTruthy()
      expect(screen.getByText(/your session has already been cancelled/i)).toBeTruthy()
    })
  })

  it('shows invalid link view on 404', async () => {
    server.use(
      http.get('*/api/public/bookings/:id', () =>
        HttpResponse.json({ success: false, message: 'Not found.' }, { status: 404 })
      )
    )

    renderCancelPage()

    await waitFor(() => {
      expect(screen.getByText(/link no longer valid/i)).toBeTruthy()
      expect(
        screen.getByText(/this cancellation link is no longer valid or has expired/i)
      ).toBeTruthy()
    })
  })

  it('shows invalid link if no token is in URL', async () => {
    renderCancelPage('')
    await waitFor(() => {
      expect(screen.getByText(/link no longer valid/i)).toBeTruthy()
    })
  })
})
