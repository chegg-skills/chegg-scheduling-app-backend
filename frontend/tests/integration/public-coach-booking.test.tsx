import { screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { PublicBookingPage } from '@/pages/public/PublicBookingPage'
import { renderWithProviders } from '../utils/renderWithProviders'
import { http, HttpResponse } from 'msw'
import { server } from '../msw/server'

// Mock react-router-dom outlet context setFramed
const mockSetFramed = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...(actual as object),
    useOutletContext: () => ({ setFramed: mockSetFramed }),
  }
})

const mockCoach = {
  id: 'coach-1',
  firstName: 'Nina',
  lastName: 'Figma',
  avatarUrl: null,
  timezone: 'America/New_York',
  publicBookingSlug: 'nina-figma',
}

const mockMultiTeamEvents = [
  {
    id: 'event-1',
    name: 'Figma Basics',
    description: 'Learn the fundamentals of Figma.',
    durationSeconds: 1800,
    locationType: 'VIRTUAL',
    teamId: 'team-1',
    publicBookingSlug: 'figma-basics',
    interactionType: 'VIDEO',
    assignmentStrategy: 'ROSTER',
    showDescription: true,
    allowStudentCoachChoice: true,
    bookingMode: 'COACH_AVAILABILITY',
    maxBookingWindowDays: 30,
    team: {
      id: 'team-1',
      name: 'Figma Design Team',
      description: 'Figma Design Team Description',
      publicBookingSlug: 'figma-design',
    },
    coaches: [],
  },
  {
    id: 'event-2',
    name: 'Product Strategy Coaching',
    description: 'Learn product roadmap planning.',
    durationSeconds: 3600,
    locationType: 'VIRTUAL',
    teamId: 'team-2',
    publicBookingSlug: 'product-strategy',
    interactionType: 'VIDEO',
    assignmentStrategy: 'ROSTER',
    showDescription: true,
    allowStudentCoachChoice: true,
    bookingMode: 'COACH_AVAILABILITY',
    maxBookingWindowDays: 30,
    team: {
      id: 'team-2',
      name: 'Product Management Team',
      description: 'Product Management Team Description',
      publicBookingSlug: 'product-pm',
    },
    coaches: [],
  },
]

describe('PublicCoachBooking Integration', () => {
  beforeEach(() => {
    mockSetFramed.mockClear()
  })

  afterEach(() => {
    cleanup()
    server.resetHandlers()
  })

  it('renders team selection first when coach is in multiple teams', async () => {
    server.use(
      http.get('*/api/public/coaches/slug/nina-figma', () => {
        return HttpResponse.json({
          success: true,
          data: { coach: mockCoach },
        })
      }),
      http.get('*/api/public/coaches/slug/nina-figma/events', () => {
        return HttpResponse.json({
          success: true,
          data: { coach: mockCoach, events: mockMultiTeamEvents },
        })
      })
    )

    renderWithProviders(
      <Routes>
        <Route path="/book/coach/:coachSlug" element={<PublicBookingPage />} />
      </Routes>,
      { initialEntries: ['/book/coach/nina-figma'] }
    )

    // 1. Should show the team selection step (since there are 2 teams)
    await screen.findByText('Figma Design Team')
    await screen.findByText('Product Management Team')
    expect(
      screen.getAllByText(/Select one of the coach’s teams to view their available sessions./i)[0]
    ).toBeInTheDocument()

    // 2. Select Figma Design Team
    const figmaTeamText = screen.getByText('Figma Design Team')
    fireEvent.click(figmaTeamText)

    // 3. Should now show the events of the Figma Design Team, but NOT the other team
    await screen.findAllByText('Figma Basics')
    expect(screen.queryByText('Product Strategy Coaching')).toBeNull()
  })

  it('skips team selection and goes straight to events when coach is in a single team', async () => {
    // Only return events under one team
    const mockSingleTeamEvents = [mockMultiTeamEvents[0]]

    server.use(
      http.get('*/api/public/coaches/slug/nina-figma', () => {
        return HttpResponse.json({
          success: true,
          data: { coach: mockCoach },
        })
      }),
      http.get('*/api/public/coaches/slug/nina-figma/events', () => {
        return HttpResponse.json({
          success: true,
          data: { coach: mockCoach, events: mockSingleTeamEvents },
        })
      })
    )

    renderWithProviders(
      <Routes>
        <Route path="/book/coach/:coachSlug" element={<PublicBookingPage />} />
      </Routes>,
      { initialEntries: ['/book/coach/nina-figma'] }
    )

    // Should skip team selection and show the event directly
    await screen.findAllByText('Figma Basics')
    // We should not see the team selection step header
    expect(screen.queryByText(/Select one of the coach’s teams/i)).toBeNull()
  })
})
