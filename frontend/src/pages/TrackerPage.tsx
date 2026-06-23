import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TrackerFilters, todayDate, type TrackerFilterState } from '@/components/tracker/TrackerFilters'
import { TrackerTable } from '@/components/tracker/TrackerTable'
import { useTrackerFilters, useTrackerSlots } from '@/hooks/queries/useTracker'
import { Button } from '@/components/shared/ui/Button'
import { APP_HEADER_MIN_HEIGHT } from '@/components/shared/layoutConstants'

export function TrackerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawStartDate = searchParams.get('startDate') ?? ''
  const rawEndDate = searchParams.get('endDate') ?? ''
  const rawTeamId = searchParams.get('team') ?? ''
  const rawEventId = searchParams.get('event') ?? ''

  const { data: filterData = { teams: [], events: [] } } = useTrackerFilters()

  const startDate = useMemo(
    () => (/^\d{4}-\d{2}-\d{2}$/.test(rawStartDate) ? rawStartDate : todayDate()),
    [rawStartDate]
  )
  const endDate = useMemo(
    () => (/^\d{4}-\d{2}-\d{2}$/.test(rawEndDate) ? rawEndDate : startDate),
    [rawEndDate, startDate]
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

  const filters: TrackerFilterState = { startDate, endDate, teamId, eventId }

  const setFilters = (newFilters: TrackerFilterState) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('startDate', newFilters.startDate)
        next.set('endDate', newFilters.endDate)
        next.delete('date')
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
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    teamId: filters.teamId || undefined,
    eventId: filters.eventId || undefined,
  }

  const { data: slots = [], isLoading: slotsLoading } = useTrackerSlots(slotsParams)

  const handleDownloadCSV = () => {
    if (slots.length === 0) return

    const headers = [
      'Date',
      'Time',
      'Team Name',
      'Event Name',
      'RSVP Count',
      'Capacity',
      'Attendance Details',
      'Host Details',
      'Summary Notes',
      'Coach Notes'
    ]

    const rows = slots.map((slot) => {
      const start = new Date(slot.startTime)
      const end = new Date(slot.endTime)

      const dateStr = start.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
      const timeStr = `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`

      const rsvp = slot.bookingCount
      const capacity = slot.capacity !== null ? slot.capacity : 'Unlimited'
      const attendance = slot.isLogged
        ? `${slot.attendedCount ?? 0} attended`
        : 'No log'
      const host = slot.assignedCoach
        ? `${slot.assignedCoach.firstName} ${slot.assignedCoach.lastName}`
        : 'Unassigned'
      const summary = slot.summary ?? ''
      const coachNotes = slot.coachNotes ?? ''

      return [
        dateStr,
        timeStr,
        slot.team.name,
        slot.event.name,
        rsvp,
        capacity,
        attendance,
        host,
        summary,
        coachNotes
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((val) => {
            const str = String(val ?? '')
            // Quote any field containing a delimiter, quote, or line break (RFC 4180).
            if (/[",\r\n]/.test(str)) {
              return `"${str.replace(/"/g, '""')}"`
            }
            return str
          })
          .join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `session_logs_${filters.startDate}_to_${filters.endDate}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Box>
      <PageHeader
        title="Tracker"
        subtitle="Monitor upcoming fixed-slot sessions and their occupancy across teams."
        actions={
          <Button
            size="sm"
            onClick={handleDownloadCSV}
            disabled={slots.length === 0}
          >
            <Download size={16} style={{ marginRight: 6 }} />
            Download CSV
          </Button>
        }
      />
      <Box sx={{ px: { xs: 2.5, md: 4 }, pb: 4 }}>
        <Box
          sx={{
            position: 'sticky',
            top: APP_HEADER_MIN_HEIGHT,
            zIndex: 10,
            bgcolor: 'background.default',
            mx: { xs: -2.5, md: -4 },
            px: { xs: 2.5, md: 4 },
            pt: 4,
            mt: -4,
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
