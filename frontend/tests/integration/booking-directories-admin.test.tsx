import { screen, waitFor, cleanup, fireEvent, within } from '@testing-library/react'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { BookingDirectoriesPage } from '@/pages/BookingDirectoriesPage'
import { renderWithProviders } from '../utils/renderWithProviders'
import { http, HttpResponse } from 'msw'
import { server } from '../msw/server'

const mockBookingDirectories = [
  {
    id: 'directory-1',
    slug: 'default',
    name: 'Default Booking Directory',
    description: 'This is the default booking directory.',
    isActive: true,
    sections: [
      {
        id: 'sec-1',
        sessionTypeId: 'st-1',
        sessionType: {
          id: 'st-1',
          slug: 'one-to-one',
          name: '1-to-1 Tutoring Session',
          description: 'Personalized engineering mentorship.',
          isActive: true,
        },
        teams: [
          {
            teamId: 'team-1',
            team: {
              id: 'team-1',
              name: 'Cyber Security Team',
              isActive: true,
            },
          },
        ],
      },
    ],
  },
]

const mockSessionTypes = [
  {
    id: 'st-1',
    slug: 'one-to-one',
    name: '1-to-1 Tutoring Session',
    description: 'Personalized engineering mentorship.',
    isActive: true,
  },
  {
    id: 'st-2',
    slug: 'group-workshop',
    name: 'Group Workshop',
    description: 'Collaborative learning session.',
    isActive: true,
  },
]

const mockTeams = [
  {
    id: 'team-1',
    name: 'Cyber Security Team',
    isActive: true,
  },
  {
    id: 'team-2',
    name: 'Web Dev Team',
    isActive: true,
  },
]

const mockEvents = [
  {
    id: 'evt-1',
    teamId: 'team-1',
    sessionTypeId: 'st-1',
    isActive: true,
  },
  {
    id: 'evt-2',
    teamId: 'team-2',
    sessionTypeId: 'st-2',
    isActive: true,
  },
]

// Keep track of calls to verify save triggers APIs correctly
const apiCalls = {
  addSection: [] as any[],
  removeSection: [] as any[],
  addTeamToSection: [] as any[],
  removeTeamFromSection: [] as any[],
}

const handlers = [
  http.get('*/api/booking-directories', () => {
    return HttpResponse.json({
      success: true,
      data: { bookingDirectories: mockBookingDirectories },
    })
  }),
  http.get('*/api/session-types', () => {
    return HttpResponse.json({
      success: true,
      data: { sessionTypes: mockSessionTypes },
    })
  }),
  http.get('*/api/teams', () => {
    return HttpResponse.json({
      success: true,
      data: { teams: mockTeams },
    })
  }),
  http.get('*/api/events', () => {
    return HttpResponse.json({
      success: true,
      data: { events: mockEvents },
    })
  }),
  // Save modifications
  http.post('*/api/booking-directories/:directoryId/sections', async ({ request, params }) => {
    const body = (await request.json()) as any
    apiCalls.addSection.push({ directoryId: params.directoryId, ...body })
    return HttpResponse.json({
      success: true,
      data: {
        bookingDirectory: {
          ...mockBookingDirectories[0],
          sections: [
            ...mockBookingDirectories[0].sections,
            {
              id: 'sec-2',
              sessionTypeId: body.sessionTypeId,
              sessionType: mockSessionTypes.find((s) => s.id === body.sessionTypeId)!,
              teams: [],
            },
          ],
        },
      },
    })
  }),
  http.delete('*/api/booking-directories/:directoryId/sections/:sectionId', ({ params }) => {
    apiCalls.removeSection.push({ directoryId: params.directoryId, sectionId: params.sectionId })
    return HttpResponse.json({
      success: true,
      data: {
        bookingDirectory: {
          ...mockBookingDirectories[0],
          sections: [],
        },
      },
    })
  }),
  http.post(
    '*/api/booking-directories/:directoryId/sections/:sectionId/teams',
    async ({ request, params }) => {
      const body = (await request.json()) as any
      apiCalls.addTeamToSection.push({
        directoryId: params.directoryId,
        sectionId: params.sectionId,
        ...body,
      })
      return HttpResponse.json({
        success: true,
        data: { bookingDirectory: mockBookingDirectories[0] },
      })
    }
  ),
  http.delete('*/api/booking-directories/:directoryId/sections/:sectionId/teams/:teamId', ({ params }) => {
    apiCalls.removeTeamFromSection.push({
      directoryId: params.directoryId,
      sectionId: params.sectionId,
      teamId: params.teamId,
    })
    return HttpResponse.json({
      success: true,
      data: { bookingDirectory: mockBookingDirectories[0] },
    })
  }),
]

describe('Booking Directories Admin Config integration', () => {
  beforeEach(() => {
    server.use(...handlers)
    apiCalls.addSection = []
    apiCalls.removeSection = []
    apiCalls.addTeamToSection = []
    apiCalls.removeTeamFromSection = []
  })

  afterEach(() => {
    cleanup()
    server.resetHandlers()
  })

  it('allows opening configuration modal, modifying state, and prompting on discard/close', async () => {
    renderWithProviders(<BookingDirectoriesPage />)

    // Wait for the booking directory to be loaded and row Actions button to be visible
    await screen.findByText('Default Booking Directory')

    // Find and click the row actions button
    const actionsButton = await screen.findByRole('button', { name: /more/i })
    fireEvent.click(actionsButton)

    // Click "Configure sessions & teams" option
    const configOption = await screen.findByText('Configure sessions & teams')
    fireEvent.click(configOption)

    // Verify modal is open and shows sections & teams tab content
    await screen.findByText('Manage Booking Directory Sessions & Teams')

    const modal = screen.getByRole('dialog')

    // Wait for dynamic category list to load inside the modal
    await within(modal).findByText('Group Workshop')

    // Toggle st-2 (Group Workshop) to enable it (making configuration dirty)
    const groupWorkshopContainer = within(modal)
      .getByText('Group Workshop')
      .closest('.MuiPaper-root')
    const groupWorkshopSwitch = groupWorkshopContainer?.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement
    expect(groupWorkshopSwitch).toBeInTheDocument()
    expect(groupWorkshopSwitch.checked).toBe(false)

    // Click the switch to toggle it
    fireEvent.click(groupWorkshopSwitch)
    expect(groupWorkshopSwitch.checked).toBe(true)

    // Wait for collapsible team grid to render and expand (ensures state updates flush)
    await within(modal).findByText('Participating Teams / Disciplines')

    // Click Cancel to close the modal
    const cancelBtn = within(modal).getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)

    // Since the state is dirty, the confirmation modal should appear
    await screen.findByText('Unsaved Changes')
    expect(screen.getByText(/You have unsaved configuration changes/i)).toBeInTheDocument()

    // Click "No" to cancel discard
    const noBtn = screen.getByRole('button', { name: /no/i })
    fireEvent.click(noBtn)

    // Confirm that the configuration modal is still open
    expect(screen.getByText('Manage Booking Directory Sessions & Teams')).toBeInTheDocument()

    // Click Cancel again
    fireEvent.click(cancelBtn)
    await screen.findByText('Unsaved Changes')

    // Click "Yes" (Discard Changes) to confirm discard
    const yesBtn = screen.getByRole('button', { name: /discard changes/i })
    fireEvent.click(yesBtn)

    // Verify configuration modal is closed
    await waitFor(() => {
      expect(
        screen.queryByText('Manage Booking Directory Sessions & Teams')
      ).not.toBeInTheDocument()
    })
  })

  it('allows dirty state protection during tab transitions', async () => {
    renderWithProviders(<BookingDirectoriesPage />)

    await screen.findByText('Default Booking Directory')
    const actionsButton = await screen.findByRole('button', { name: /more/i })
    fireEvent.click(actionsButton)
    const configOption = await screen.findByText('Configure sessions & teams')
    fireEvent.click(configOption)

    await screen.findByText('Manage Booking Directory Sessions & Teams')

    const modal = screen.getByRole('dialog')

    // Wait for dynamic category list to load inside the modal
    await within(modal).findByText('Group Workshop')

    // Dirty the state by toggling Group Workshop
    const groupWorkshopContainer = within(modal)
      .getByText('Group Workshop')
      .closest('.MuiPaper-root')
    const groupWorkshopSwitch = groupWorkshopContainer?.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement
    fireEvent.click(groupWorkshopSwitch)

    // Wait for collapsible team grid to render and expand (ensures state updates flush)
    await within(modal).findByText('Participating Teams / Disciplines')

    // Click on the Details tab
    const detailsTab = within(modal).getByRole('tab', { name: /details/i })
    fireEvent.click(detailsTab)

    // Confirmation modal should appear
    await screen.findByText('Unsaved Changes')

    // Click No to cancel discard
    const noBtn = screen.getByRole('button', { name: /no/i })
    fireEvent.click(noBtn)

    // Verify we remain on the Sections & Teams tab
    expect(screen.getByText('Manage Booking Directory Sessions & Teams')).toBeInTheDocument()

    // Click Details tab again
    fireEvent.click(detailsTab)
    await screen.findByText('Unsaved Changes')

    // Click Yes to discard changes and switch tab
    const yesBtn = screen.getByRole('button', { name: /discard changes/i })
    fireEvent.click(yesBtn)

    // Wait and verify we switched to Details tab (which renders BookingDirectoryForm with a Name label)
    await screen.findByLabelText(/Name/i)
    expect(screen.queryByText('Manage Booking Directory Sessions & Teams')).not.toBeInTheDocument()
  })

  it('successfully saves dirty changes and closes the modal without prompts', async () => {
    renderWithProviders(<BookingDirectoriesPage />)

    await screen.findByText('Default Booking Directory')
    const actionsButton = await screen.findByRole('button', { name: /more/i })
    fireEvent.click(actionsButton)
    const configOption = await screen.findByText('Configure sessions & teams')
    fireEvent.click(configOption)

    await screen.findByText('Manage Booking Directory Sessions & Teams')

    const modal = screen.getByRole('dialog')

    // Wait for dynamic category list to load inside the modal
    await within(modal).findByText('Group Workshop')

    // Enable Group Workshop
    const groupWorkshopContainer = within(modal)
      .getByText('Group Workshop')
      .closest('.MuiPaper-root')
    const groupWorkshopSwitch = groupWorkshopContainer?.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement
    fireEvent.click(groupWorkshopSwitch)

    // Wait for collapsible team grid to render and expand (ensures state updates flush)
    await within(modal).findByText('Participating Teams / Disciplines')

    // Select 1-to-1 Tutoring Session in the left column
    const tutoringContainer = within(modal)
      .getByText('1-to-1 Tutoring Session')
      .closest('.MuiPaper-root')
    fireEvent.click(tutoringContainer!)

    // Under the active 1-to-1 Tutoring Session detail pane, click Web Dev Team checkbox card to assign it
    const webDevTeamCard = within(modal).getByText('Web Dev Team').closest('.MuiPaper-root')
    expect(webDevTeamCard).toBeInTheDocument()
    fireEvent.click(webDevTeamCard!)

    // Click Save Changes to submit form
    const saveBtn = within(modal).getByRole('button', { name: /save changes/i })
    fireEvent.click(saveBtn)

    // Verify saving calls appropriate APIs sequentially and closes without warning
    await waitFor(() => {
      expect(
        screen.queryByText('Manage Booking Directory Sessions & Teams')
      ).not.toBeInTheDocument()
    })

    // Verify calls to backend APIs occurred as expected
    expect(apiCalls.addSection).toHaveLength(1)
    expect(apiCalls.addSection[0]).toEqual({ directoryId: 'directory-1', sessionTypeId: 'st-2' })

    expect(apiCalls.addTeamToSection).toHaveLength(1)
    expect(apiCalls.addTeamToSection[0]).toEqual({
      directoryId: 'directory-1',
      sectionId: 'sec-1',
      teamId: 'team-2',
    })
  })
})
