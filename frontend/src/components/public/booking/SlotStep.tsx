import * as React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import type { AvailableSlot } from '@/api/public'
import { SlotGroup } from './SlotGroup'

interface SlotStepProps {
  slots: AvailableSlot[]
  loading: boolean
  selectedDate: Date
  onDateSelect: (date: Date) => void
  selectedSlot: string | null
  onSelect: (slot: string) => void
  maxBookingWindowDays?: number | null
}

const timeFormat = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const dateFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export function SlotStep({
  slots,
  loading,
  selectedDate,
  onDateSelect,
  selectedSlot,
  onSelect,
  maxBookingWindowDays,
}: SlotStepProps) {
  // Use UTC arithmetic to match the backend's window calculation in
  // availability.service.ts. Both sides pin to UTC end-of-day so the boundary
  // is the same regardless of the server's or client's local timezone.
  const maxDate = React.useMemo(() => {
    if (maxBookingWindowDays == null) return undefined
    const d = new Date()
    d.setUTCDate(d.getUTCDate() + maxBookingWindowDays)
    d.setUTCHours(23, 59, 59, 999)
    return d
  }, [maxBookingWindowDays])

  const { amSlots, pmSlots } = React.useMemo(() => {
    const am: AvailableSlot[] = []
    const pm: AvailableSlot[] = []

    const sorted = [...slots].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    sorted.forEach((s) => {
      const date = new Date(s.startTime)
      if (date.getHours() < 12) {
        am.push(s)
      } else {
        pm.push(s)
      }
    })

    return { amSlots: am, pmSlots: pm }
  }, [slots])

  return (
    <Box sx={{ overflow: 'hidden', height: { lg: '100%' } }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        alignItems="stretch"
        divider={
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' } }} />
        }
        sx={{ height: '100%' }}
      >
        {/* Column 1: Calendar Picker */}
        <Box sx={{ width: { xs: '100%', lg: 400 }, flexShrink: 0, p: 3 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            fontWeight={800}
            sx={{ display: 'block', mb: 2, letterSpacing: 1.2, fontSize: '0.7rem' }}
          >
            Select date
          </Typography>
          <Paper
            variant="outlined"
            sx={{ overflow: 'hidden', borderRadius: 1, bgcolor: 'background.paper' }}
          >
            <StaticDatePicker
              displayStaticWrapperAs="desktop"
              value={selectedDate}
              onChange={(newValue) => newValue && onDateSelect(newValue)}
              minDate={new Date()}
              maxDate={maxDate}
              shouldDisableDate={(day) => (maxDate ? day > maxDate : false)}
              slotProps={{
                actionBar: { actions: [] },
              }}
              sx={{
                '.MuiDateCalendar-root': {
                  width: '100%',
                  maxWidth: 'none',
                },
              }}
            />
          </Paper>
        </Box>

        {/* Column 2: Slot Selection */}
        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              fontWeight={800}
              sx={{ display: 'block', mb: 1, letterSpacing: 1.2, fontSize: '0.7rem' }}
            >
              Available slots
            </Typography>
            <Typography variant="h6" fontWeight={800} color="text.primary">
              {dateFormat.format(selectedDate)}
            </Typography>
          </Box>
          <Divider sx={{ mb: 1 }} />

          {/* Scrollable area for slots */}
          <Box
            sx={{
              overflowY: 'auto',
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
      </Stack>
    </Box>
  )
}
