import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useDashboardStats } from '@/hooks/queries/useStats'
import { renderWithProviders } from '../utils/renderWithProviders'

function DashboardStatsProbe() {
  const { data, isPending, isError } = useDashboardStats('thisMonth')

  if (isPending) {
    return <p>Loading stats</p>
  }
  if (isError) {
    return <p role="alert">Error</p>
  }

  return <p role="status">{data?.metrics.scheduledBookings ?? '—'}</p>
}

describe('GET /api/v1/stats/dashboard (MSW)', () => {
  it('feeds useDashboardStats via the default handler', async () => {
    renderWithProviders(<DashboardStatsProbe />)

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('42')
  })
})
