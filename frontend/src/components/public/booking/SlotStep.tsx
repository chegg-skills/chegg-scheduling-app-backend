import * as React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'

import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import { PickersDay } from '@mui/x-date-pickers/PickersDay'
import type { PickersDayProps } from '@mui/x-date-pickers/PickersDay'
import { format } from 'date-fns'

import { PageSpinner } from '@/components/shared/ui/Spinner'
import type { AvailableSlot } from '@/api/public'

import { SlotGroup } from './SlotGroup'
import { startOfDayInTimezone } from '@/utils/dateTimezone'
import { PublicTimezoneSelect } from './PublicTimezoneSelect'
import { SlotDebugPanel } from './SlotDebugPanel'

interface SlotStepProps {
  slots: AvailableSlot[]
  loading: boolean
  selectedDate: Date
  onDateSelect: (date: Date) => void
  selectedSlot: string | null
  onSelect: (slot: string) => void
  maxBookingWindowDays?: number | null
  isFixedSlots?: boolean
  availableDates?: Set<string>
  isLoadingDates?: boolean
  onMonthChange?: (date: Date) => void
  selectedTimezone: string
  setSelectedTimezone: (tz: string) => void
  eventId?: string
  showDebug?: boolean
  /** Booking currently being rescheduled — forwarded to SlotDebugPanel so its
   * own prior time doesn't show as a false conflict for its coach. */
  excludeBookingId?: string
}

function makeSlotDayIndicator(availableDates: Set<string> | undefined) {
  return function SlotDayIndicator({ day, outsideCurrentMonth, ...props }: PickersDayProps) {
    const hasSlots = !outsideCurrentMonth && !!availableDates?.has(format(day, 'yyyy-MM-dd'))
    return (
      <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <PickersDay day={day} outsideCurrentMonth={outsideCurrentMonth} {...props} />
        {hasSlots && !props.disabled && (
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

export function SlotStep({
  slots,
  loading,
  selectedDate,
  onDateSelect,
  selectedSlot,
  onSelect,
  maxBookingWindowDays,
  isFixedSlots,
  availableDates,
  isLoadingDates,
  onMonthChange,
  selectedTimezone,
  setSelectedTimezone,
  eventId,
  showDebug = false,
  excludeBookingId,
}: SlotStepProps) {
  const timeFormat = React.useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: selectedTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    [selectedTimezone]
  )

  const dateFormat = React.useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    []
  )

  const hourExtractor = React.useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: selectedTimezone,
        hour: 'numeric',
        hourCycle: 'h23',
      }),
    [selectedTimezone]
  )

  // Anchor the booking window to end-of-day in the student's selected timezone,
  // mirroring the backend's endOfBookingWindowInTimezone helper. This prevents
  // UTC±12 students from seeing the window end a full day early or late.
  const maxDate = React.useMemo(() => {
    if (maxBookingWindowDays == null) return undefined
    const now = new Date()
    const windowDayStart = startOfDayInTimezone(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + maxBookingWindowDays + 1,
      selectedTimezone
    )
    return new Date(windowDayStart.getTime() - 1)
  }, [maxBookingWindowDays, selectedTimezone])

  const DaySlot = React.useMemo(() => makeSlotDayIndicator(availableDates), [availableDates])

  const { amSlots, pmSlots } = React.useMemo(() => {
    const am: AvailableSlot[] = []
    const pm: AvailableSlot[] = []

    const sorted = [...slots].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    sorted.forEach((s) => {
      const date = new Date(s.startTime)
      const hourStr = hourExtractor.format(date)
      const hour = parseInt(hourStr, 10)

      if (hour < 12) {
        am.push(s)
      } else {
        pm.push(s)
      }
    })

    return { amSlots: am, pmSlots: pm }
  }, [slots, hourExtractor])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        alignItems="stretch"
        sx={{ flexGrow: 1, minHeight: 0 }}
        divider={
          <Divider
            orientation="vertical"
            flexItem
            sx={{ display: { xs: 'none', lg: 'block' } }}
          />
        }
      >
        {/* Column 1: Calendar Picker */}
        <Box sx={{ width: { xs: '100%', lg: 380 }, flexShrink: 0, p: { xs: 2, lg: 3 } }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: 1 }}
            >
              1. Select date
            </Typography>
          </Box>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <StaticDatePicker
              displayStaticWrapperAs="desktop"
              value={selectedDate}
              onChange={(newValue) => newValue && onDateSelect(newValue)}
              onMonthChange={onMonthChange}
              minDate={new Date()}
              maxDate={maxDate}
              shouldDisableDate={(day) => {
                if (maxDate && day > maxDate) return true
                if (isFixedSlots && !isLoadingDates && availableDates) {
                  return !availableDates.has(format(day, 'yyyy-MM-dd'))
                }
                return false
              }}
              slots={{ day: DaySlot }}
              slotProps={{
                actionBar: { actions: [] },
              }}
              sx={{
                '.MuiDateCalendar-root': { width: '100%', maxWidth: 'none' },
              }}
            />
          </Paper>
          <Box sx={{ mt: 1.5, width: '100%' }}>
            <PublicTimezoneSelect value={selectedTimezone} onChange={setSelectedTimezone} />
          </Box>
        </Box>

        {/* Column 2: Slot Selection */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, lg: 3 },
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
              sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}
            >
              2. Available slots
            </Typography>
            <Typography variant="h6" fontWeight={800} color="text.primary">
              {dateFormat.format(selectedDate)}
            </Typography>
          </Box>
          <Divider sx={{ mb: 1 }} />

          <Box
            sx={{
              overflowY: { xs: 'visible', lg: 'auto' },
              flexGrow: 1,
              pr: 1,
              mt: 1,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.200', borderRadius: 2 },
            }}
          >
            {loading ? (
              <PageSpinner />
            ) : slots.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">
                  No availability on this date.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ pb: 2 }}>
                <SlotGroup
                  title="Morning"
                  slots={amSlots}
                  selectedSlot={selectedSlot}
                  onSelect={onSelect}
                  timeFormat={timeFormat}
                />
                <SlotGroup
                  title="Afternoon & Evening"
                  slots={pmSlots}
                  selectedSlot={selectedSlot}
                  onSelect={onSelect}
                  timeFormat={timeFormat}
                />
              </Box>
            )}
          </Box>
        </Box>

        {/* Column 3: Availability Debug */}
        <SlotDebugPanel
          eventId={eventId}
          selectedDate={selectedDate}
          selectedTimezone={selectedTimezone}
          dateLabel={format(selectedDate, 'MMM d, yyyy')}
          show={showDebug}
          excludeBookingId={excludeBookingId}
        />
      </Stack>
    </Box>
  )
}
