import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { useEvents, useTeamEvents } from '@/hooks/useEvents'

interface EventFilterProps {
  teamId?: string
  value: string
  onChange: (eventId: string) => void
}

export function EventFilter({ teamId, value, onChange }: EventFilterProps) {
  // If teamId is provided, fetch team events. Otherwise fetch all.
  const { data: teamData, isLoading: teamLoading } = useTeamEvents(teamId!, {
    page: 1,
    pageSize: 100,
  })
  const { data: allData, isLoading: allLoading } = useEvents({ page: 1, pageSize: 200 })

  const events = teamId ? (teamData?.events ?? []) : (allData?.events ?? [])
  const isLoading = teamId ? teamLoading : allLoading

  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value)
  }

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel id="event-filter-label">Filter by Event</InputLabel>
      <Select
        labelId="event-filter-label"
        id="event-filter"
        value={value}
        label="Filter by Event"
        onChange={handleChange}
        disabled={isLoading}
      >
        <MenuItem value="">
          <em>All Events</em>
        </MenuItem>
        {events.map((event) => (
          <MenuItem key={event.id} value={event.id}>
            {event.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
