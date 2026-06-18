import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { PageHeader } from '@/components/shared/PageHeader'
import { TrackerFilters, todayDate, type TrackerFilterState } from '@/components/tracker/TrackerFilters'
import { TrackerTable } from '@/components/tracker/TrackerTable'
import { useTrackerFilters, useTrackerSlots } from '@/hooks/queries/useTracker'

export function TrackerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawDate = searchParams.get('date') ?? ''
  const rawTeamId = searchParams.get('team') ?? ''
  const rawEventId = searchParams.get('event') ?? ''

  const { data: filterData = { teams: [], events: [] } } = useTrackerFilters()

  const date = useMemo(
    () => (/^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayDate()),
    [rawDate]
  )

  const teamId = useMemo(
    () => (filterData.teams.some((t) => t.id === rawTeamId) ? rawTeamId : ''),
    [rawTeamId, filterData.teams]
  )

  const eventId = useMemo(() => {
    const validEvent = filterData.events.find((e) => e.id === rawEventId)
    if (!validEvent) return ''
    if (teamId && validEvent.teamId !== teamId) return ''
    return rawEventId
  }, [rawEventId, filterData.events, teamId])

  const filters: TrackerFilterState = { date, teamId, eventId }

  const setFilters = (newFilters: TrackerFilterState) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('date', newFilters.date)
        if (newFilters.teamId) next.set('team', newFilters.teamId)
        else next.delete('team')
        if (newFilters.eventId) next.set('event', newFilters.eventId)
        else next.delete('event')
        return next
      },
      { replace: true }
    )
  }

  const slotsParams = {
    date: filters.date || undefined,
    teamId: filters.teamId || undefined,
    eventId: filters.eventId || undefined,
  }

  const { data: slots = [], isLoading: slotsLoading } = useTrackerSlots(slotsParams)

  return (
    <Box>
      <PageHeader
        title="Tracker"
        subtitle="Monitor upcoming fixed-slot sessions and their occupancy across teams."
      />
      <Box sx={{ px: { xs: 2.5, md: 4 }, pb: 4 }}>
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: 'background.default',
            mx: { xs: -2.5, md: -4 },
            px: { xs: 2.5, md: 4 },
          }}
        >
          <TrackerFilters filters={filters} filterData={filterData} onChange={setFilters} />
        </Box>

        <Stack direction="row" alignItems="center" sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {slotsLoading ? '' : `${slots.length} session${slots.length !== 1 ? 's' : ''} found`}
          </Typography>
        </Stack>

        <TrackerTable slots={slots} isLoading={slotsLoading} />
      </Box>
    </Box>
  )
}
