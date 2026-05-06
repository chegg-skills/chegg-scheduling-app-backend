import { screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { EventsPage } from '@/pages/EventsPage'
import { renderWithProviders } from '../utils/renderWithProviders'
import { http, HttpResponse } from 'msw'
import { server } from '../msw/server'

// Mock useAuth so we control the user persona without needing a live /api/users/me
const mockUseAuth = vi.fn()
vi.mock('@/context/auth', async () => {
  const actual = await vi.importActual('@/context/auth')
  return {
    ...(actual as any),
    useAuth: () => mockUseAuth(),
  }
})

const handlers = [
  http.get('*/api/teams', () => {
    return HttpResponse.json({
      success: true,
      data: {
        teams: [
          { id: 'team-1', name: 'Math Team', isActive: true },
          { id: 'team-2', name: 'Science Team', isActive: true },
        ],
      },
    })
  }),
  http.get('*/api/teams/:id/events', () => {
    return HttpResponse.json({
      success: true,
      data: {
        events: [{ id: 'event-1', name: 'Algebra 101', duration: 30, isActive: true, coaches: [] }],
      },
    })
  }),
  http.get('*/api/v1/stats/events', () => {
    return HttpResponse.json({
      success: true,
      data: {
        metrics: { newEvents: 1, activeEvents: 1, roundRobinEvents: 0, hostedEvents: 1 },
        timeframe: { label: 'January 2026' },
      },
    })
  }),
]

describe('Events Domain Integration', () => {
  // Re-register handlers before EACH test so they survive server.resetHandlers()
  beforeEach(() => {
    server.use(...handlers)
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('should guide user to select a team and then display events', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', role: 'SUPER_ADMIN' },
      isAuthenticated: true,
    })

    renderWithProviders(<EventsPage />)

    // 1. Wait for teams to load, then verify initial empty-state message
    await screen.findByText(/Please select a team/i, {}, { timeout: 8000 })

    // 2. Open the MUI Select via its aria-label and pick a team
    const selectEl = screen.getByLabelText('Select team')
    fireEvent.mouseDown(selectEl)
    fireEvent.click(await screen.findByText('Math Team'))

    // 3. Verify events load
    await waitFor(
      () => {
        expect(screen.getByText('Algebra 101')).toBeInTheDocument()
      },
      { timeout: 8000 }
    )
    expect(screen.getByText('Active events')).toBeInTheDocument()
  }, 15000)

  it('should show "New event" button only for admins', async () => {
    // 1. Admin persona
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', role: 'SUPER_ADMIN' },
      isAuthenticated: true,
    })
    renderWithProviders(<EventsPage />)

    await screen.findByText(/Please select a team/i, {}, { timeout: 8000 })

    const selectEl = screen.getByLabelText('Select team')
    fireEvent.mouseDown(selectEl)
    fireEvent.click(await screen.findByText('Math Team'))

    expect(screen.getAllByRole('button', { name: /New event/i })[0]).toBeInTheDocument()

    // 2. Switch to coach persona
    cleanup()

    mockUseAuth.mockReturnValue({
      user: { id: 'coach-1', role: 'COACH' },
      isAuthenticated: true,
    })
    renderWithProviders(<EventsPage />)

    await screen.findByText(/Please select a team/i, {}, { timeout: 8000 })

    const selectEl2 = screen.getByLabelText('Select team')
    fireEvent.mouseDown(selectEl2)
    fireEvent.click(await screen.findByText('Math Team'))

    expect(screen.queryAllByRole('button', { name: /New event/i })).toHaveLength(0)
  }, 15000)
})
