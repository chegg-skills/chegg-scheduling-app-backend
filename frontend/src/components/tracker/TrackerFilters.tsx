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
import { startOfMonth, endOfMonth, format, addDays, subDays, min as minOfDates, max as maxOfDates } from 'date-fns'
import type { TrackerFilters as TrackerFiltersData } from '@/api/tracker'
import { useTrackerSessionDates } from '@/hooks/queries/useTracker'

export interface TrackerFilterState {
  startDate: string
  endDate: string
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

const now = new Date()
const MIN_DATE = new Date(now.getFullYear() - 2, 0, 1)
const MAX_DATE = new Date(now.getFullYear() + 2, 11, 31)
// Keep the selectable range within a year so the backend never has to scan an
// unbounded window (the API enforces the same cap).
const MAX_RANGE_DAYS = 365

export function TrackerFilters({ filters, filterData, onChange }: TrackerFiltersProps) {
  const startDateObj = new Date(filters.startDate + 'T00:00:00')
  const endDateObj = new Date(filters.endDate + 'T00:00:00')

  // Each picker tracks the month it is displaying so its availability dots are
  // fetched independently — navigating one picker never affects the other.
  const [startCalendarMonth, setStartCalendarMonth] = useState(() => startDateObj)
  const [endCalendarMonth, setEndCalendarMonth] = useState(() => endDateObj)

  const startSessionDates = useTrackerSessionDates({
    startDate: format(startOfMonth(startCalendarMonth), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(startCalendarMonth), 'yyyy-MM-dd'),
    teamId: filters.teamId || undefined,
    eventId: filters.eventId || undefined,
  })
  const endSessionDates = useTrackerSessionDates({
    startDate: format(startOfMonth(endCalendarMonth), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(endCalendarMonth), 'yyyy-MM-dd'),
    teamId: filters.teamId || undefined,
    eventId: filters.eventId || undefined,
  })

  const StartDaySlot = useMemo(() => makeSessionDayIndicator(startSessionDates), [startSessionDates])
  const EndDaySlot = useMemo(() => makeSessionDayIndicator(endSessionDates), [endSessionDates])

  // Cross-constrain the two pickers: start can never be after end (or more than
  // MAX_RANGE_DAYS before it), and vice versa — preventing inverted/oversized ranges.
  const startPickerMin = maxOfDates([MIN_DATE, subDays(endDateObj, MAX_RANGE_DAYS)])
  const startPickerMax = endDateObj
  const endPickerMin = startDateObj
  const endPickerMax = minOfDates([MAX_DATE, addDays(startDateObj, MAX_RANGE_DAYS)])

  const visibleEvents = filters.teamId
    ? filterData.events.filter((e) => e.teamId === filters.teamId)
    : filterData.events

  const handleTeamChange = (teamId: string) => {
    onChange({ ...filters, teamId, eventId: '' })
  }

  const shiftRange = (direction: -1 | 1) => {
    const [sy, sm, sd] = filters.startDate.split('-').map(Number)
    const [ey, em, ed] = filters.endDate.split('-').map(Number)
    const spanDays =
      Math.round(
        (new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    const shift = spanDays * direction
    onChange({
      ...filters,
      startDate: toLocalDateString(new Date(sy, sm - 1, sd + shift)),
      endDate: toLocalDateString(new Date(ey, em - 1, ed + shift)),
    })
  }

  const isToday = filters.startDate === todayDate() && filters.endDate === todayDate()

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
      {/* Left: date range fields + nav */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" spacing={2} flexWrap="wrap">
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <DatePicker
            label="Start Date"
            value={startDateObj}
            minDate={startPickerMin}
            maxDate={startPickerMax}
            onChange={(val) => {
              if (val) onChange({ ...filters, startDate: toLocalDateString(val) })
            }}
            onMonthChange={(month) => setStartCalendarMonth(month)}
            format="dd-MMM-yy"
            slots={{ day: StartDaySlot }}
            slotProps={{
              textField: {
                size: 'small',
                sx: { width: 160 },
              },
              popper: {
                modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
              },
            }}
          />

          <DatePicker
            label="End Date"
            value={endDateObj}
            minDate={endPickerMin}
            maxDate={endPickerMax}
            onChange={(val) => {
              if (val) onChange({ ...filters, endDate: toLocalDateString(val) })
            }}
            onMonthChange={(month) => setEndCalendarMonth(month)}
            format="dd-MMM-yy"
            slots={{ day: EndDaySlot }}
            slotProps={{
              textField: {
                size: 'small',
                sx: { width: 160 },
              },
              popper: {
                modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
              },
            }}
          />
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Stack
            direction="row"
            alignItems="center"
            onClick={() => shiftRange(-1)}
            sx={{ cursor: 'pointer', color: 'text.secondary', userSelect: 'none', '&:hover': { color: 'text.primary' } }}
          >
            <ChevronLeft size={16} />
            <Typography variant="body2">Pre</Typography>
          </Stack>
          <Typography variant="body2" color="text.disabled">:</Typography>
          <Typography
            variant="body2"
            onClick={() => onChange({ ...filters, startDate: todayDate(), endDate: todayDate() })}
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
            onClick={() => shiftRange(1)}
            sx={{ cursor: 'pointer', color: 'text.secondary', userSelect: 'none', '&:hover': { color: 'text.primary' } }}
          >
            <Typography variant="body2">Next</Typography>
            <ChevronRight size={16} />
          </Stack>
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
