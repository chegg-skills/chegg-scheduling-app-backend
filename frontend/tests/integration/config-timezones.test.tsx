import { useQuery } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { configApi } from '@/api/config'
import { renderWithProviders } from '../utils/renderWithProviders'

function TimezonesProbe() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['config', 'timezones'],
    queryFn: ({ signal }) => configApi.getTimezones(signal).then((res) => res.data.data),
  })

  if (isPending) {
    return <p>Loading timezones</p>
  }
  if (isError) {
    return <p role="alert">Error</p>
  }
  return <p role="status">{data?.timezones.join(',')}</p>
}

describe('GET /api/config/timezones (MSW)', () => {
  it('resolves axios + React Query against the default handler', async () => {
    renderWithProviders(<TimezonesProbe />)

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('UTC,America/New_York')
  })
})
