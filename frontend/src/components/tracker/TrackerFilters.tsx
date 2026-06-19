import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { PickersDay } from '@mui/x-date-pickers/PickersDay'
import type { PickersDayProps } from '@mui/x-date-pickers/PickersDay'
import Typography from '@mui/material/Typography'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import type { TrackerFilters as TrackerFiltersData } from '@/api/tracker'
import { useTrackerSessionDates } from '@/hooks/queries/useTracker'

export interface TrackerFilterState {
  date: string
  teamId: string
  eventId: string
}

interface TrackerFiltersProps {
  filters: TrackerFilterState
  filterData: TrackerFiltersData
  onChange: (filters: TrackerFilterState) => void
}

function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return toLocalDateString(new Date(y, m - 1, d + days))
}

export const todayDate = () => toLocalDateString(new Date())

function makeSessionDayIndicator(sessionDates: Set<string>) {
  return function SessionDayIndicator({ day, outsideCurrentMonth, ...props }: PickersDayProps) {
    const hasSession = !outsideCurrentMonth && sessionDates.has(format(day, 'yyyy-MM-dd'))
    return (
      <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <PickersDay day={day} outsideCurrentMonth={outsideCurrentMonth} {...props} />
        {hasSession && !props.disabled && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 3,
              width: 4,
              height: 4,
              borderRadius: '50%',
              bgcolor: props.selected ? 'primary.contrastText' : 'primary.main',
              pointerEvents: 'none',
            }}
          />
        )}
      </Box>
    )
  }
}

export function TrackerFilters({ filters, filterData, onChange }: TrackerFiltersProps) {
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(filters.date + 'T00:00:00')
  )

  const startDate = format(startOfMonth(calendarMonth), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(calendarMonth), 'yyyy-MM-dd')

  const sessionDates = useTrackerSessionDates({
    startDate,
    endDate,
    teamId: filters.teamId || undefined,
    eventId: filters.eventId || undefined,
  })

  const DaySlot = useMemo(() => makeSessionDayIndicator(sessionDates), [sessionDates])

  const visibleEvents = filters.teamId
    ? filterData.events.filter((e) => e.teamId === filters.teamId)
    : filterData.events

  const handleTeamChange = (teamId: string) => {
    onChange({ ...filters, teamId, eventId: '' })
  }

  const isToday = filters.date === todayDate()

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems="center"
      justifyContent="space-between"
      flexWrap="wrap"
      gap={2}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1.5,
      }}
    >
      {/* Left: date field + nav */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <DatePicker
          value={new Date(filters.date + 'T00:00:00')}
          onChange={(val) => {
            if (val) onChange({ ...filters, date: toLocalDateString(val) })
          }}
          onMonthChange={(month) => setCalendarMonth(month)}
          format="dd-MMM-yy"
          slots={{ day: DaySlot }}
          slotProps={{
            textField: {
              size: 'small',
              sx: { width: 165 },
            },
            popper: {
              modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
            },
          }}
        />

        <Stack
          direction="row"
          alignItems="center"
          onClick={() => onChange({ ...filters, date: shiftDate(filters.date, -1) })}
          sx={{ cursor: 'pointer', color: 'text.secondary', userSelect: 'none', '&:hover': { color: 'text.primary' } }}
        >
          <ChevronLeft size={16} />
          <Typography variant="body2">Pre</Typography>
        </Stack>
        <Typography variant="body2" color="text.disabled">:</Typography>
        <Typography
          variant="body2"
          onClick={() => onChange({ ...filters, date: todayDate() })}
          sx={{
            cursor: 'pointer',
            userSelect: 'none',
            fontWeight: isToday ? 700 : 400,
            color: isToday ? 'primary.main' : 'text.secondary',
            '&:hover': { color: 'primary.main' },
          }}
        >
          Today
        </Typography>
        <Typography variant="body2" color="text.disabled">:</Typography>
        <Stack
          direction="row"
          alignItems="center"
          onClick={() => onChange({ ...filters, date: shiftDate(filters.date, 1) })}
          sx={{ cursor: 'pointer', color: 'text.secondary', userSelect: 'none', '&:hover': { color: 'text.primary' } }}
        >
          <Typography variant="body2">Next</Typography>
          <ChevronRight size={16} />
        </Stack>
      </Stack>

      {/* Right: team + event filters */}
      <Stack direction="row" alignItems="center" spacing={2}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel shrink>Team</InputLabel>
          <Select
            value={filters.teamId}
            label="Team"
            displayEmpty
            onChange={(e) => handleTeamChange(e.target.value)}
            MenuProps={{ PaperProps: { sx: { mt: 1 } } }}
          >
            <MenuItem value="">All teams</MenuItem>
            {filterData.teams.map((team) => (
              <MenuItem key={team.id} value={team.id}>
                {team.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel shrink>Event</InputLabel>
          <Select
            value={filters.eventId}
            label="Event"
            displayEmpty
            onChange={(e) => onChange({ ...filters, eventId: e.target.value })}
            disabled={visibleEvents.length === 0}
            MenuProps={{
              PaperProps: { sx: { mt: 1 } },
              anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
              transformOrigin: { vertical: 'top', horizontal: 'right' },
            }}
          >
            <MenuItem value="">All events</MenuItem>
            {visibleEvents.map((event) => (
              <MenuItem key={event.id} value={event.id}>
                {event.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Stack>
  )
}
