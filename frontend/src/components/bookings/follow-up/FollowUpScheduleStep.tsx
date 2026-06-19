import { Box, Typography, Stack, Divider, Paper } from '@mui/material'
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import type { Booking } from '@/types'
import { INTERACTION_TYPE_CAPS } from '@/constants/interactionTypes'
import type { InteractionType } from '@/constants/interactionTypes'
import { PublicTimezoneSelect } from '@/components/public/booking/PublicTimezoneSelect'
import { SlotGroup } from '@/components/public/booking/SlotGroup'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { SlotDebugPanel } from '@/components/public/booking/SlotDebugPanel'

interface FollowUpScheduleStepProps {
  booking: Booking
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  selectedSlot: string | null
  setSelectedSlot: (slot: string | null) => void
  selectedTimezone: string
  setSelectedTimezone: (tz: string) => void
  maxDate: Date | undefined
  isLoadingSlots: boolean
  slots: unknown[]
  amSlots: any[]
  pmSlots: any[]
  timeFormat: Intl.DateTimeFormat
  dateFormat: Intl.DateTimeFormat
  showDebug?: boolean
  eventId?: string
}

/** Step 1 — date picker + timezone select + available morning/afternoon slots. */
export function FollowUpScheduleStep({
  booking,
  selectedDate,
  setSelectedDate,
  selectedSlot,
  setSelectedSlot,
  selectedTimezone,
  setSelectedTimezone,
  maxDate,
  isLoadingSlots,
  slots,
  amSlots,
  pmSlots,
  timeFormat,
  dateFormat,
  showDebug = false,
  eventId,
}: FollowUpScheduleStepProps) {
  return (
    <Stack
      direction={{ xs: 'column', lg: 'row' }}
      alignItems="stretch"
      sx={{ height: '100%', minHeight: 0 }}
      divider={
        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' } }} />
      }
    >
      {/* Calendar Picker Column */}
      <Box sx={{ width: { xs: '100%', lg: 380 }, flexShrink: 0, p: { xs: 2, lg: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
            onChange={(newValue) => {
              if (newValue) {
                setSelectedDate(newValue)
                setSelectedSlot(null)
              }
            }}
            minDate={new Date()}
            maxDate={maxDate}
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

      {/* Slots List Column */}
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
            {(() => {
              const caps = booking.event?.interactionType
                ? INTERACTION_TYPE_CAPS[booking.event.interactionType as InteractionType]
                : null
              if (caps?.multipleParticipants) {
                return '2. Available Group Slots'
              }
              return `2. Available Slots (${booking.coach ? `${booking.coach.firstName} ${booking.coach.lastName}` : 'Coach'})`
            })()}
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
          {isLoadingSlots ? (
            <PageSpinner />
          ) : slots.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                {booking.event?.bookingMode === 'FIXED_SLOTS'
                  ? "No pre-created slots for this date. Create new slots in the event's Schedule tab first."
                  : 'No availability for the coach on this date.'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ pb: 2 }}>
              <SlotGroup
                title="Morning"
                slots={amSlots}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
                timeFormat={timeFormat}
              />
              <SlotGroup
                title="Afternoon & Evening"
                slots={pmSlots}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
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
        dateLabel={dateFormat.format(selectedDate)}
        show={showDebug}
      />
    </Stack>
  )
}
