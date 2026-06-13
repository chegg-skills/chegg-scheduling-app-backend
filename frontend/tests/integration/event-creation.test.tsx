import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { EventsPage } from '@/pages/EventsPage'
import { renderWithProviders } from '../utils/renderWithProviders'
import { http, HttpResponse } from 'msw'
import { server } from '../msw/server'

// Mock useAuth
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
        teams: [{ id: 'team-1', name: 'Math Team', isActive: true }],
      },
    })
  }),
  http.get('*/api/teams/team-1/events', () => {
    return HttpResponse.json({
      success: true,
      data: { events: [] },
    })
  }),
  http.get('*/api/v1/stats/events', () => {
    return HttpResponse.json({
      success: true,
      data: {
        metrics: { newEvents: 0, activeEvents: 0, roundRobinEvents: 0, hostedEvents: 0 },
        timeframe: { label: 'January 2026' },
      },
    })
  }),
  http.get('*/api/event-types', () => {
    return HttpResponse.json({
      success: true,
      data: {
        eventTypes: [{ id: 'type-1', name: 'Tutorial', isActive: true }],
      },
    })
  }),
  http.get('*/api/teams/team-1/members', () => {
    return HttpResponse.json({
      success: true,
      data: {
        members: [
          {
            id: 'coach-1',
            coachUserId: 'user-1',
            user: { firstName: 'John', lastName: 'Coach' },
            role: 'COACH',
          },
        ],
      },
    })
  }),
  http.post('*/api/teams/team-1/events', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      data: { id: 'event-new', ...(body as any) },
    })
  }),
]

describe('Event Creation Integration', () => {
  beforeEach(() => {
    server.use(...handlers)
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', role: 'SUPER_ADMIN' },
      isAuthenticated: true,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('should allow an admin to create a new one-to-one event', async () => {
    renderWithProviders(<EventsPage />)

    // 1. Open "New event" modal
    const newEventBtn = await screen.findByRole('button', { name: /New event/i })
    fireEvent.click(newEventBtn)

    // Wait for modal to open
    expect(await screen.findByRole('heading', { name: /New event/i })).toBeInTheDocument()

    // 2. Select Team in the form
    const teamSelect = await screen.findByRole('combobox', { name: /Team/i })
    fireEvent.mouseDown(teamSelect)
    fireEvent.click(await screen.findByRole('option', { name: 'Math Team' }))

    // 3. Fill Basic Info
    const nameInput = await screen.findByLabelText(/Event name/i)
    fireEvent.change(nameInput, { target: { value: 'New Test Event' } })

    const descInput = screen.getByLabelText(/Description/i)
    fireEvent.change(descInput, { target: { value: 'Test description' } })

    // 4. Select Event Type
    const typeSelect = await screen.findByRole('combobox', { name: /Event type/i })
    fireEvent.mouseDown(typeSelect)
    fireEvent.click(await screen.findByRole('option', { name: /Tutorial/i }))

    // 5. Select Interaction Type (Default is ONE_TO_ONE, but let's click it to be sure)
    fireEvent.click(screen.getByText(/One-to-One/i))

    // 6. Fill Location
    fireEvent.click(screen.getByText('Shared Event Link'))
    const locationValueInput = await screen.findByLabelText(/Meeting Link/i)
    fireEvent.change(locationValueInput, { target: { value: 'https://zoom.us/test' } })

    // 7. Fill Scheduling Policy (Duration)
    const durationInput = screen.getByLabelText(/Duration/i)
    fireEvent.change(durationInput, { target: { value: '45' } })

    // 8. Select Default Event Host
    const hostSelect = await screen.findByRole('combobox', { name: /Default Event Host/i })
    fireEvent.mouseDown(hostSelect)
    fireEvent.click(await screen.findByRole('option', { name: /John Coach/i }))

    // 9. Submit
    const createBtn = screen.getByRole('button', { name: /Create event/i })
    fireEvent.click(createBtn)

    // 10. Verify modal closes
    await waitFor(() => {
      expect(screen.queryByText(/New event/i, { selector: 'h2' })).not.toBeInTheDocument()
    })
  }, 20000)

  it('should allow an admin to create a group workshop (one-to-many)', async () => {
    renderWithProviders(<EventsPage />)

    // 1. Open "New event" modal
    const newEventBtn = await screen.findByRole('button', { name: /New event/i })
    fireEvent.click(newEventBtn)

    // Wait for modal to open
    expect(await screen.findByRole('heading', { name: /New event/i })).toBeInTheDocument()

    // 2. Select Team in the form
    const teamSelect = await screen.findByRole('combobox', { name: /Team/i })
    fireEvent.mouseDown(teamSelect)
    fireEvent.click(await screen.findByRole('option', { name: 'Math Team' }))

    // 3. Fill Basic Info
    fireEvent.change(await screen.findByLabelText(/Event name/i), {
      target: { value: 'Group Tutorial' },
    })

    // 4. Select Event Type
    const typeSelect = await screen.findByRole('combobox', { name: /Event type/i })
    fireEvent.mouseDown(typeSelect)
    fireEvent.click(await screen.findByRole('option', { name: /Tutorial/i }))

    // 5. Select Interaction Type -> One-to-Many
    fireEvent.click(screen.getByText(/One-to-Many/i))

    // 6. Fill Location
    fireEvent.click(screen.getByText('Shared Event Link'))
    const locationValueInput = await screen.findByLabelText(/Meeting Link/i)
    fireEvent.change(locationValueInput, { target: { value: 'https://zoom.us/group' } })

    // 7. Fill Participant Capacity (shown for One-to-Many)
    const maxInput = screen.getByLabelText(/Participant Capacity/i)
    fireEvent.change(maxInput, { target: { value: '20' } })

    // 8. Select Default Event Host
    const hostSelect = await screen.findByRole('combobox', { name: /Default Event Host/i })
    fireEvent.mouseDown(hostSelect)
    fireEvent.click(await screen.findByRole('option', { name: /John Coach/i }))

    // 9. Submit
    fireEvent.click(screen.getByRole('button', { name: /Create event/i }))

    // 10. Verify modal closes
    await waitFor(() => {
      expect(screen.queryByText(/New event/i, { selector: 'h2' })).not.toBeInTheDocument()
    })
  }, 20000)
})
