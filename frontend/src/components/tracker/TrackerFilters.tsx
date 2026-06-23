import { useState } from 'react'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import { alpha, type Theme } from '@mui/material/styles'
import { ChevronLeft, ChevronRight, CalendarRange, ChevronDown } from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  subWeeks,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  endOfYear,
  subYears,
} from 'date-fns'
import type { TrackerFilters as TrackerFiltersData } from '@/api/tracker'
import { DateFilterModal, DEFAULT_TIMEFRAMES } from '@/components/shared/form/DateFilterModal'
import type { StatsTimeframe } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'

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

function getTimeframeDateRange(timeframe: StatsTimeframe): { startDate: string; endDate: string } {
  const today = new Date()
  let start: Date
  let end: Date

  if (timeframe.startsWith('custom:')) {
    const parts = timeframe.split(':')
    return {
      startDate: parts[1],
      endDate: parts[2],
    }
  }

  switch (timeframe) {
    case 'today':
      start = today
      end = today
      break
    case 'yesterday':
      start = subDays(today, 1)
      end = subDays(today, 1)
      break
    case 'thisWeek':
      start = startOfWeek(today, { weekStartsOn: 1 })
      end = endOfWeek(today, { weekStartsOn: 1 })
      break
    case 'lastWeek':
      const lastWeek = subWeeks(today, 1)
      start = startOfWeek(lastWeek, { weekStartsOn: 1 })
      end = endOfWeek(lastWeek, { weekStartsOn: 1 })
      break
    case 'thisMonth':
      start = startOfMonth(today)
      end = endOfMonth(today)
      break
    case 'lastMonth':
      const lastMonth = subMonths(today, 1)
      start = startOfMonth(lastMonth)
      end = endOfMonth(lastMonth)
      break
    case 'thisQuarter':
      start = startOfQuarter(today)
      end = endOfQuarter(today)
      break
    case 'lastQuarter':
      const lastQuarter = subQuarters(today, 1)
      start = startOfQuarter(lastQuarter)
      end = endOfQuarter(lastQuarter)
      break
    case 'thisYear':
      start = startOfYear(today)
      end = endOfYear(today)
      break
    case 'lastYear':
      const lastYear = subYears(today, 1)
      start = startOfYear(lastYear)
      end = endOfYear(lastYear)
      break
    case 'all':
    default:
      // Since the slots API enforces a max 366-day range validation limit,
      // we default "All time" to a 365-day window centered around today
      // (180 days in the past to 185 days in the future).
      start = subDays(today, 180)
      end = addDays(today, 185)
      break
  }

  return {
    startDate: toLocalDateString(start),
    endDate: toLocalDateString(end),
  }
}

function detectTimeframe(startDate: string, endDate: string): StatsTimeframe {
  for (const tf of DEFAULT_TIMEFRAMES) {
    if (tf.value === 'all') continue
    const range = getTimeframeDateRange(tf.value)
    if (range.startDate === startDate && range.endDate === endDate) {
      return tf.value
    }
  }
  return `custom:${startDate}:${endDate}`
}

function formatPeriodDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return format(date, 'dd-MMM-yy')
  } catch {
    return dateStr
  }
}

export function TrackerFilters({ filters, filterData, onChange }: TrackerFiltersProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const currentTimeframe = detectTimeframe(filters.startDate, filters.endDate)

  const handleTimeframeChange = (newTf: StatsTimeframe) => {
    const range = getTimeframeDateRange(newTf)
    onChange({
      ...filters,
      startDate: range.startDate,
      endDate: range.endDate,
    })
  }

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
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" spacing={2} flexWrap="wrap">
        {/* Navigation Pill */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{
            height: 38,
            bgcolor: (theme: Theme) => alpha(theme.palette.secondary.main, 0.02),
            px: 1.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.02)',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            onClick={() => shiftRange(-1)}
            sx={{ cursor: 'pointer', color: 'text.secondary', userSelect: 'none', '&:hover': { color: 'primary.main' } }}
          >
            <ChevronLeft size={16} />
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>Pre</Typography>
          </Stack>
          <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>·</Typography>
          <Typography
            variant="body2"
            onClick={() => onChange({ ...filters, startDate: todayDate(), endDate: todayDate() })}
            sx={{
              cursor: 'pointer',
              userSelect: 'none',
              fontWeight: 600,
              color: isToday ? 'primary.main' : 'text.secondary',
              '&:hover': { color: 'primary.main' },
              fontSize: '0.8125rem',
            }}
          >
            Today
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>·</Typography>
          <Stack
            direction="row"
            alignItems="center"
            onClick={() => shiftRange(1)}
            sx={{ cursor: 'pointer', color: 'text.secondary', userSelect: 'none', '&:hover': { color: 'primary.main' } }}
          >
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>Next</Typography>
            <ChevronRight size={16} />
          </Stack>
        </Stack>

        {/* Period Badge */}
        <Box
          sx={{
            height: 38,
            display: 'inline-flex',
            alignItems: 'center',
            px: 1.5,
            borderRadius: 2,
            bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.03),
            border: '1px solid',
            borderColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.15),
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Period:
          </Typography>
          <Typography variant="caption" color="text.primary" sx={{ fontWeight: 500, ml: 0.5 }}>
            {formatPeriodDate(filters.startDate)} to {formatPeriodDate(filters.endDate)}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="inherit"
          onClick={() => setModalOpen(true)}
          startIcon={<CalendarRange size={16} style={{ color: '#E87100' }} />}
          endIcon={<ChevronDown size={14} style={{ opacity: 0.7 }} />}
          sx={{
            height: 38,
            px: 2.5,
            borderRadius: 2,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            textTransform: 'none',
            fontWeight: 600,
            color: 'text.primary',
            '&:hover': {
              backgroundColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.04),
              borderColor: 'primary.main',
            },
          }}
        >
          {currentTimeframe.startsWith('custom:')
            ? 'Custom Range'
            : (DEFAULT_TIMEFRAMES.find((tf) => tf.value === currentTimeframe)?.label ?? 'Select Date Range')}
        </Button>

        <DateFilterModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          currentValue={currentTimeframe}
          onChange={handleTimeframeChange}
        />
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
            <MenuItem value="">All Teams</MenuItem>
            {filterData.teams.map((team) => (
              <MenuItem key={team.id} value={team.id}>
                {toTitleCase(team.name)}
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
            <MenuItem value="">All Events</MenuItem>
            {visibleEvents.map((event) => (
              <MenuItem key={event.id} value={event.id}>
                {toTitleCase(event.name)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Stack>
  )
}
