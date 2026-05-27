import { screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Route, Routes, useLocation } from 'react-router-dom'
import { PublicBookingPageDirectory } from '@/pages/public/PublicBookingPageDirectory'
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

const mockBookingPage = {
  id: 'page-1',
  slug: 'eng-academy',
  name: 'Engineering Academy Booking',
  description: 'Welcome to the engineering academy booking directory.',
  isActive: true,
  sections: [
    {
      sessionType: {
        id: '11111111-2222-3333-4444-555555555555',
        slug: 'one-to-one',
        name: '1-to-1 Tutoring Session',
        description: 'Personalized engineering mentorship.',
        sortOrder: 1,
      },
      teams: [
        {
          team: {
            id: '6314a78c-19f7-4e0c-8f4c-200296e75858',
            name: 'Cyber Security Team',
            publicBookingSlug: 'cyber-sec',
            isActive: true,
          },
          events: [
            {
              id: 'event-1',
              slug: 'cyber-sec-tutoring',
              name: 'Cyber Security Mentorship',
              durationSeconds: 1800,
              locationType: 'VIRTUAL',
              interactionType: 'VIDEO',
              publicBookingSlug: 'cyber-sec-tutoring',
            },
            {
              id: 'event-2',
              slug: 'cyber-sec-advanced',
              name: 'Advanced Cyber Security',
              durationSeconds: 3600,
              locationType: 'VIRTUAL',
              interactionType: 'VIDEO',
              publicBookingSlug: 'cyber-sec-advanced',
            },
          ],
        },
      ],
    },
  ],
}

const handlers = [
  http.get('*/api/public/booking-pages/slug/:slug', ({ params }) => {
    if (params.slug === 'eng-academy' || params.slug === 'default') {
      return HttpResponse.json({
        success: true,
        data: { bookingPage: mockBookingPage },
      })
    }
    return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  }),
]

function LocationDisplay() {
  const location = useLocation()
  return (
    <div data-testid="location-display" style={{ display: 'none' }}>
      {location.pathname + location.search}
    </div>
  )
}

function renderDirectoryPage(slug = 'eng-academy') {
  return renderWithProviders(
    <Routes>
      <Route
        path="/book/page/:pageSlug"
        element={
          <>
            <PublicBookingPageDirectory />
            <LocationDisplay />
          </>
        }
      />
      <Route
        path="/book/sessions"
        element={
          <>
            <PublicBookingPageDirectory />
            <LocationDisplay />
          </>
        }
      />
      <Route
        path="/book/sessions/:sessionTypeSlug"
        element={
          <>
            <PublicBookingPageDirectory />
            <LocationDisplay />
          </>
        }
      />
      <Route
        path="/book/sessions/:sessionTypeSlug/:teamSlug"
        element={
          <>
            <PublicBookingPageDirectory />
            <LocationDisplay />
          </>
        }
      />
      <Route path="/book/event/:eventSlug" element={<div>Slot Picker Step</div>} />
    </Routes>,
    { initialEntries: [`/book/page/${slug}`] }
  )
}

describe('PublicBookingPageDirectory Integration', () => {
  beforeEach(() => {
    server.use(...handlers)
    mockSetFramed.mockClear()
  })

  afterEach(() => {
    cleanup()
    server.resetHandlers()
  })

  it('renders the booking page header and details correctly', async () => {
    renderDirectoryPage()

    // Verify it calls setFramed(true) on load
    await waitFor(() => {
      expect(mockSetFramed).toHaveBeenCalledWith(true)
    })

    // Verify logo is displayed and description is displayed
    await screen.findByAltText('Chegg Skills')
    expect(
      screen.getByText('Welcome to the engineering academy booking directory.')
    ).toBeInTheDocument()
  })

  it('displays category, team, and event card in progressive drill-down steps', async () => {
    renderDirectoryPage()

    // 1. Step 1: Wait for category to render on the landing page
    await screen.findByText('1-to-1 Tutoring Session')
    expect(screen.getByText('1 discipline available')).toBeInTheDocument()
    expect(screen.getByTestId('location-display').textContent).toContain('/book/page/eng-academy')

    // Verify team and events are NOT visible initially
    expect(screen.queryByText('Cyber Security Team')).toBeNull()
    expect(screen.queryByText('Cyber Security Mentorship')).toBeNull()

    // Click category card to drill down to Step 2
    const categoryCard = screen.getByText('1-to-1 Tutoring Session').closest('.MuiPaper-root')
    expect(categoryCard).toBeTruthy()
    fireEvent.click(categoryCard!)

    // 2. Step 2: Verify Team Name is visible, but events are NOT
    await screen.findByText('Cyber Security Team')
    expect(screen.queryByText('Cyber Security Mentorship')).toBeNull()
    expect(screen.getByTestId('location-display').textContent).toContain(
      '/book/sessions/one-to-one'
    )
    expect(screen.getByTestId('location-display').textContent).not.toContain('cyber-sec')

    // Click team card to drill down to Step 3
    const teamCard = screen.getByText('Cyber Security Team').closest('.MuiPaper-root')
    expect(teamCard).toBeTruthy()
    fireEvent.click(teamCard!)

    // 3. Step 3: Verify Event loads
    await screen.findByText('Cyber Security Mentorship')
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getAllByText('Virtual')[0]).toBeInTheDocument()
    expect(screen.getByTestId('location-display').textContent).toContain(
      '/book/sessions/one-to-one/cyber-sec'
    )

    // 4. Test "Back to teams" button
    const backToTeamsBtn = screen.getByRole('button', { name: /back to teams/i })
    fireEvent.click(backToTeamsBtn)

    // Verify we are back on Step 2 (Team list visible, Event hidden)
    await screen.findByText('Cyber Security Team')
    expect(screen.queryByText('Cyber Security Mentorship')).toBeNull()
    expect(screen.getByTestId('location-display').textContent).toContain(
      '/book/sessions/one-to-one'
    )
    expect(screen.getByTestId('location-display').textContent).not.toContain('cyber-sec')

    // 5. Test "Back to all session categories" button
    const backToCategoriesBtn = screen.getByRole('button', {
      name: /back to all session categories/i,
    })
    fireEvent.click(backToCategoriesBtn)

    // Verify we are back on Step 1 (Categories visible, Team hidden)
    await screen.findByText('Select a Session Category')
    expect(screen.queryByText('Cyber Security Team')).toBeNull()
    expect(screen.getByTestId('location-display').textContent).toContain('/book/sessions')
  })

  it('routes to the slot picker wizard step when clicking an event card', async () => {
    renderDirectoryPage()

    // 1. Click category card
    await screen.findByText('1-to-1 Tutoring Session')
    const categoryCard = screen.getByText('1-to-1 Tutoring Session').closest('.MuiPaper-root')
    fireEvent.click(categoryCard!)

    // 2. Click team card
    await screen.findByText('Cyber Security Team')
    const teamCard = screen.getByText('Cyber Security Team').closest('.MuiPaper-root')
    fireEvent.click(teamCard!)

    // 3. Click on the event card
    await screen.findByText('Cyber Security Mentorship')
    const eventCard = screen.getByText('Cyber Security Mentorship').closest('.MuiPaper-root')
    expect(eventCard).toBeTruthy()
    fireEvent.click(eventCard!)

    // 4. Verify routing happened successfully to the Slot Picker placeholder
    await screen.findByText('Slot Picker Step')
  })

  it('shows error state if booking page not found', async () => {
    renderDirectoryPage('non-existent')

    await screen.findByText('No sessions available')
    expect(screen.getByText(/There are no booking sessions configured/i)).toBeInTheDocument()
  })

  it('renders Step 2 empty state card when category has 0 teams', async () => {
    const mockPageEmptyCategory = {
      ...mockBookingPage,
      sections: [
        {
          sessionType: {
            id: '77777777-8888-9999-0000-aaaaaaaaaaaa',
            slug: 'empty-sessions',
            name: 'Empty Session Category',
            description: 'No teams under this.',
            sortOrder: 1,
          },
          teams: [],
        },
      ],
    }

    server.use(
      http.get('*/api/public/booking-pages/slug/:slug', () => {
        return HttpResponse.json({
          success: true,
          data: { bookingPage: mockPageEmptyCategory },
        })
      })
    )

    renderWithProviders(
      <Routes>
        <Route
          path="/book/page/:pageSlug"
          element={
            <>
              <PublicBookingPageDirectory />
              <LocationDisplay />
            </>
          }
        />
        <Route
          path="/book/sessions/:sessionTypeSlug"
          element={
            <>
              <PublicBookingPageDirectory />
              <LocationDisplay />
            </>
          }
        />
      </Routes>,
      { initialEntries: ['/book/page/eng-academy?category=77777777-8888-9999-0000-aaaaaaaaaaaa'] }
    )

    // Verify empty state shows up
    await screen.findByText('No participating teams available')
    expect(
      screen.getByText(/There are currently no active disciplines or teams configured/i)
    ).toBeInTheDocument()

    // Verify "Explore all session categories" CTA button is NOT visible
    expect(screen.queryByRole('button', { name: /explore all session categories/i })).toBeNull()
  })

  it('redirects directly to slot picker when clicking a team with a single event', async () => {
    const mockPageSingleEvent = {
      ...mockBookingPage,
      sections: [
        {
          sessionType: {
            id: '11111111-2222-3333-4444-555555555555',
            slug: 'one-to-one',
            name: '1-to-1 Tutoring Session',
            description: 'Personalized engineering mentorship.',
            sortOrder: 1,
          },
          teams: [
            {
              team: {
                id: '6314a78c-19f7-4e0c-8f4c-200296e75858',
                name: 'Cyber Security Team',
                publicBookingSlug: 'cyber-sec',
                isActive: true,
              },
              events: [
                {
                  id: 'event-1',
                  slug: 'cyber-sec-tutoring',
                  name: 'Cyber Security Mentorship',
                  durationSeconds: 1800,
                  locationType: 'VIRTUAL',
                  interactionType: 'VIDEO',
                  publicBookingSlug: 'cyber-sec-tutoring',
                },
              ],
            },
          ],
        },
      ],
    }

    server.use(
      http.get('*/api/public/booking-pages/slug/:slug', () => {
        return HttpResponse.json({
          success: true,
          data: { bookingPage: mockPageSingleEvent },
        })
      })
    )

    renderDirectoryPage()

    // 1. Click category card
    await screen.findByText('1-to-1 Tutoring Session')
    const categoryCard = screen.getByText('1-to-1 Tutoring Session').closest('.MuiPaper-root')
    fireEvent.click(categoryCard!)

    // 2. Click team card (which only has 1 event)
    await screen.findByText('Cyber Security Team')
    const teamCard = screen.getByText('Cyber Security Team').closest('.MuiPaper-root')
    fireEvent.click(teamCard!)

    // 3. Verify it redirects directly to slot picker page (skipping event listing)
    await screen.findByText('Slot Picker Step')
  })

  it('redirects directly to slot picker when directly navigating to a team with a single event', async () => {
    const mockPageSingleEvent = {
      ...mockBookingPage,
      sections: [
        {
          sessionType: {
            id: '11111111-2222-3333-4444-555555555555',
            slug: 'one-to-one',
            name: '1-to-1 Tutoring Session',
            description: 'Personalized engineering mentorship.',
            sortOrder: 1,
          },
          teams: [
            {
              team: {
                id: '6314a78c-19f7-4e0c-8f4c-200296e75858',
                name: 'Cyber Security Team',
                publicBookingSlug: 'cyber-sec',
                isActive: true,
              },
              events: [
                {
                  id: 'event-1',
                  slug: 'cyber-sec-tutoring',
                  name: 'Cyber Security Mentorship',
                  durationSeconds: 1800,
                  locationType: 'VIRTUAL',
                  interactionType: 'VIDEO',
                  publicBookingSlug: 'cyber-sec-tutoring',
                },
              ],
            },
          ],
        },
      ],
    }

    server.use(
      http.get('*/api/public/booking-pages/slug/:slug', () => {
        return HttpResponse.json({
          success: true,
          data: { bookingPage: mockPageSingleEvent },
        })
      })
    )

    renderWithProviders(
      <Routes>
        <Route
          path="/book/sessions/:sessionTypeSlug/:teamSlug"
          element={
            <>
              <PublicBookingPageDirectory />
              <LocationDisplay />
            </>
          }
        />
        <Route path="/book/event/:eventSlug" element={<div>Slot Picker Step</div>} />
      </Routes>,
      { initialEntries: ['/book/sessions/one-to-one/cyber-sec'] }
    )

    // Verify it redirects directly to slot picker page (skipping event listing)
    await screen.findByText('Slot Picker Step')
  })
})
