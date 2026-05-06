import { screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { TeamDetailPage } from '@/pages/TeamDetailPage'
import { renderWithProviders } from '../utils/renderWithProviders'
import { http, HttpResponse } from 'msw'
import { server } from '../msw/server'

// Mock the useParams hook
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...(actual as any),
    useParams: () => ({ teamId: 'team-1' }),
  }
})

const teamId = 'team-1'

const baseHandlers = [
  http.get('*/api/teams/:id', () => {
    return HttpResponse.json({
      success: true,
      data: { id: teamId, name: 'Test Team', isActive: true },
    })
  }),
  http.get('*/api/teams/:id/members', () => {
    return HttpResponse.json({
      success: true,
      data: { members: [] },
    })
  }),
  http.get('*/api/teams/:id/events', () => {
    return HttpResponse.json({
      success: true,
      data: { events: [] },
    })
  }),
  http.get('*/api/teams/:id/notification-config', () => {
    return HttpResponse.json({
      success: true,
      data: {
        bookingCancellations: false,
        bookingConfirmations: false,
        noShowNotifications: false,
        reminder24h: false,
        reminder1h: false,
      },
    })
  }),
]

describe('Permission Gating: Team Notifications', () => {
  beforeEach(() => {
    server.use(...baseHandlers)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('should enable checkboxes for TEAM_ADMIN', async () => {
    server.use(
      http.get('*/api/users/me', () => {
        return HttpResponse.json({
          success: true,
          data: { id: 'admin-1', role: 'TEAM_ADMIN', firstName: 'Admin', lastName: 'User' },
        })
      })
    )

    renderWithProviders(<TeamDetailPage />)

    // Switch to Notifications tab
    const notificationsTab = await screen.findByRole('tab', { name: /Notifications/i })
    fireEvent.click(notificationsTab)

    // Wait for the loading to finish
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument())

    // Check if a checkbox is enabled
    const cancellationCheckbox = await screen.findByLabelText(/Booking cancellations/i)
    expect(cancellationCheckbox).not.toBeDisabled()
  })

  it('should disable checkboxes for COACH', async () => {
    server.use(
      http.get('*/api/users/me', () => {
        return HttpResponse.json({
          success: true,
          data: { id: 'coach-1', role: 'COACH', firstName: 'Coach', lastName: 'User' },
        })
      })
    )

    renderWithProviders(<TeamDetailPage />)

    // Switch to Notifications tab
    const notificationsTab = await screen.findByRole('tab', { name: /Notifications/i })
    fireEvent.click(notificationsTab)

    // Wait for the loading to finish
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument())

    // Check if a checkbox is disabled
    const cancellationCheckbox = await screen.findByLabelText(/Booking cancellations/i)
    expect(cancellationCheckbox).toBeDisabled()
  })
})
