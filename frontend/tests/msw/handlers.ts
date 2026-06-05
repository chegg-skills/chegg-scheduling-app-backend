import { http, HttpResponse } from 'msw'

import type { ApiResponse, StatsSummary } from '@/types'

type TimezonesBody = {
  timezones: Array<{
    iana: string
    label: string
    group: string
  }>
}

/** Minimal `StatsSummary` matching `useDashboardStats` / dashboard card shape. */
const dashboardThisMonth: StatsSummary = {
  timeframe: {
    key: 'thisMonth',
    label: 'This month',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-01-31T23:59:59.999Z',
    rangeLabel: 'January 2026',
  },
  metrics: {
    scheduledBookings: 42,
    upcomingBookings: 5,
    activeUsers: 10,
    activeEvents: 3,
    activeTeams: 2,
  },
}

const timezonesPayload: ApiResponse<TimezonesBody> = {
  success: true,
  message: 'Timezones fetched successfully.',
  data: {
    timezones: [
      { iana: 'UTC', label: 'Coordinated Universal Time', group: 'UTC' },
      { iana: 'America/New_York', label: 'Eastern Time (US & Canada)', group: 'US/Canada' },
    ],
  },
}

const dashboardPayload: ApiResponse<StatsSummary> = {
  success: true,
  message: 'Dashboard stats retrieved successfully.',
  data: dashboardThisMonth,
}

function pathIs(pathname: string) {
  return ({ request }: { request: Request }) => new URL(request.url).pathname === pathname
}

/**
 * Default HTTP stubs for integration tests.
 * Match by pathname so requests work whether `axios` uses `http://localhost/api`
 * or `http://localhost:4000/api` (from `VITE_API_BASE_URL`).
 * Override per test with `server.use(...)` from `tests/msw/server`.
 */
export const defaultHandlers = [
  http.get(pathIs('/api/config/timezones'), () => HttpResponse.json(timezonesPayload)),
  http.get(pathIs('/api/v1/stats/dashboard'), () => HttpResponse.json(dashboardPayload)),
  http.get(pathIs('/api/users/me'), () =>
    HttpResponse.json({
      success: true,
      data: { id: 'default-user', role: 'SUPER_ADMIN', firstName: 'Default', lastName: 'User' },
    })
  ),
]
