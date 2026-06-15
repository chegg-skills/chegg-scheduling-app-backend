import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { PageHeader } from '@/components/shared/PageHeader'
import { TrackerFilters, todayDate, type TrackerFilterState } from '@/components/tracker/TrackerFilters'
import { TrackerTable } from '@/components/tracker/TrackerTable'
import { useTrackerFilters, useTrackerSlots } from '@/hooks/queries/useTracker'

export function TrackerPage() {
  const [filters, setFilters] = useState<TrackerFilterState>({
    date: todayDate(),
    teamId: '',
    eventId: '',
  })

  const slotsParams = {
    date: filters.date || undefined,
    teamId: filters.teamId || undefined,
    eventId: filters.eventId || undefined,
  }

  const { data: slots = [], isLoading: slotsLoading } = useTrackerSlots(slotsParams)
  const { data: filterData = { teams: [], events: [] } } = useTrackerFilters()

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
            pt: 2,
            pb: 2,
            mx: { xs: -2.5, md: -4 },
            px: { xs: 2.5, md: 4 },
          }}
        >
          <Paper variant="outlined" sx={{ px: 2.5, py: 4, borderRadius: 1, bgcolor: 'action.hover' }}>
            <TrackerFilters filters={filters} filterData={filterData} onChange={setFilters} />
          </Paper>
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
