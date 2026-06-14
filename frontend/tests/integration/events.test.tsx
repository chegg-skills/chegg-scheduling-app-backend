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
        events: [
          {
            id: 'event-1',
            name: 'Algebra 101',
            durationSeconds: 1800,
            isActive: true,
            coaches: [],
            eventTypeId: 'type-1',
            locationType: 'VIRTUAL',
            locationValue: 'http://zoom.us',
            bookingMode: 'COACH_AVAILABILITY',
            interactionType: 'ONE_TO_ONE',
          },
        ],
      },
    })
  }),
  http.get('*/api/events', () => {
    return HttpResponse.json({
      success: true,
      data: {
        events: [
          {
            id: 'event-1',
            name: 'Algebra 101',
            durationSeconds: 1800,
            isActive: true,
            coaches: [],
            eventTypeId: 'type-1',
            teamId: 'team-1',
            team: { id: 'team-1', name: 'Math Team' },
            locationType: 'VIRTUAL',
            locationValue: 'http://zoom.us',
            bookingMode: 'COACH_AVAILABILITY',
            interactionType: 'ONE_TO_ONE',
          },
          {
            id: 'event-2',
            name: 'Biology Basics',
            durationSeconds: 3600,
            isActive: true,
            coaches: [],
            eventTypeId: 'type-1',
            teamId: 'team-2',
            team: { id: 'team-2', name: 'Science Team' },
            locationType: 'VIRTUAL',
            locationValue: 'http://zoom.us',
            bookingMode: 'COACH_AVAILABILITY',
            interactionType: 'ONE_TO_ONE',
          },
        ],
      },
    })
  }),
  http.get('*/api/event-types', () => {
    return HttpResponse.json({
      success: true,
      data: {
        eventTypes: [
          { id: 'type-1', key: 'mock-interview', name: 'Mock Interview', isActive: true },
          { id: 'type-2', key: 'resume-review', name: 'Resume Review', isActive: true },
        ],
      },
    })
  }),
  http.get('*/api/teams/:teamId/event-groups', () => {
    return HttpResponse.json({
      success: true,
      data: {
        groups: [],
      },
    })
  }),
  http.get('*/api/v1/stats/events', () => {
    return HttpResponse.json({
      success: true,
      data: {
        metrics: { newEvents: 2, activeEvents: 2, roundRobinEvents: 0, hostedEvents: 2 },
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

    // 1. Wait for event types to load, then verify initial empty-state message
    await screen.findByRole('heading', { name: /Select an Event Type/i, level: 6 }, { timeout: 8000 })

    // 2. Select an Event Type from the sidebar
    fireEvent.click(await screen.findByText('Mock Interview'))

    // 3. Verify it prompts to select a team
    await screen.findByRole('heading', { name: /Select a Team/i, level: 6 }, { timeout: 8000 })

    // 4. Open the MUI Select via its aria-label and pick a team
    const selectEl = screen.getByLabelText('Select team')
    fireEvent.mouseDown(selectEl)
    fireEvent.click(await screen.findByRole('option', { name: 'Math Team' }))

    // 5. Verify events load
    await waitFor(
      () => {
        expect(screen.getByText('Algebra 101')).toBeInTheDocument()
      },
      { timeout: 8000 }
    )
    expect(screen.getByText('Active events')).toBeInTheDocument()
  }, 15000)

  it('should allow selecting "All teams" and display events from all teams', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', role: 'SUPER_ADMIN' },
      isAuthenticated: true,
    })

    renderWithProviders(<EventsPage />)

    await screen.findByRole('heading', { name: /Select an Event Type/i, level: 6 }, { timeout: 8000 })
    fireEvent.click(await screen.findByText('Mock Interview'))

    await screen.findByRole('heading', { name: /Select a Team/i, level: 6 }, { timeout: 8000 })

    const selectEl = screen.getByLabelText('Select team')
    fireEvent.mouseDown(selectEl)
    fireEvent.click(await screen.findByRole('option', { name: 'All teams' }))

    // Verify events from multiple teams are loaded
    await waitFor(
      () => {
        expect(screen.getByText('Algebra 101')).toBeInTheDocument()
        expect(screen.getByText('Biology Basics')).toBeInTheDocument()
      },
      { timeout: 8000 }
    )

    // Verify team badges are displayed
    expect(screen.getByText('Math Team')).toBeInTheDocument()
    expect(screen.getByText('Science Team')).toBeInTheDocument()
  }, 15000)

  it('should show "New event" button only for admins', async () => {
    // 1. Admin persona
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', role: 'SUPER_ADMIN' },
      isAuthenticated: true,
    })
    renderWithProviders(<EventsPage />)

    await screen.findByRole('heading', { name: /Select an Event Type/i, level: 6 }, { timeout: 8000 })

    expect(screen.getAllByRole('button', { name: /New event/i })[0]).toBeInTheDocument()

    // 2. Switch to coach persona
    cleanup()

    mockUseAuth.mockReturnValue({
      user: { id: 'coach-1', role: 'COACH' },
      isAuthenticated: true,
    })
    renderWithProviders(<EventsPage />)

    await screen.findByRole('heading', { name: /Select an Event Type/i, level: 6 }, { timeout: 8000 })

    expect(screen.queryAllByRole('button', { name: /New event/i })).toHaveLength(0)
  }, 15000)
})
