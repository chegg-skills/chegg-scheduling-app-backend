import * as React from 'react'
import { Box, Typography, Stack, Divider, Paper, CircularProgress, Chip } from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import type { Booking } from '@/types'
import { INTERACTION_TYPE_CAPS } from '@/constants/interactionTypes'
import type { InteractionType } from '@/constants/interactionTypes'
import { PublicTimezoneSelect } from '@/components/public/booking/PublicTimezoneSelect'
import { SlotGroup } from '@/components/public/booking/SlotGroup'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { useSlotDebugReport } from '@/hooks/queries/useSlotDebug'
import { SlotDebugRow } from '@/components/public/booking/SlotStep'
import { usePublicSessionUser } from '@/hooks/usePublicSessionUser'

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
  const theme = useTheme()
  const { isInternalUser } = usePublicSessionUser()

  const debugDateString = React.useMemo(() => {
    const y = selectedDate.getFullYear()
    const m = `${selectedDate.getMonth() + 1}`.padStart(2, '0')
    const d = `${selectedDate.getDate()}`.padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [selectedDate])

  const { data: debugData, isLoading: debugLoading, isError: debugError } = useSlotDebugReport(
    eventId,
    debugDateString,
    selectedTimezone,
    showDebug && isInternalUser && !!eventId
  )

  const fmtTime = React.useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: selectedTimezone || undefined,
    })
    return (iso: string) => formatter.format(new Date(iso))
  }, [selectedTimezone])

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

        {/* Scrollable area for slots */}
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
                  ? 'No pre-created slots for this date. Create new slots in the event’s Schedule tab first.'
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

      {/* Column 3: Availability Debug Diagnostics Panel */}
      {showDebug && isInternalUser && eventId && (
        <Box
          sx={{
            width: { xs: '100%', lg: 360 },
            flexShrink: 0,
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
              Availability Debug
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              Diagnostics for {dateFormat.format(selectedDate)}.
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box
            sx={{
              overflowY: 'auto',
              flexGrow: 1,
              pr: 0.5,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.200', borderRadius: 2 },
            }}
          >
            {debugLoading ? (
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 3, justifyContent: 'center' }}>
                <CircularProgress size={20} thickness={4} />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Loading diagnostics...
                </Typography>
              </Stack>
            ) : debugError ? (
              <Typography variant="body2" color="error" align="center">
                Failed to load debug report.
              </Typography>
            ) : debugData ? (
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    p: 1.75,
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    background:
                      theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(2, 136, 209, 0.08) 0%, rgba(0, 0, 0, 0) 100%)'
                        : 'linear-gradient(135deg, rgba(2, 136, 209, 0.04) 0%, rgba(255, 255, 255, 0) 100%)',
                  }}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" fontWeight={700} color="text.primary">
                        {debugData.visibleSlots} of {debugData.totalSlots} slots visible
                      </Typography>
                      <Chip
                        size="small"
                        label={debugData.visibleSlots > 0 ? 'Active' : 'No Slots'}
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.675rem',
                          height: 18,
                          borderRadius: 1,
                          bgcolor: debugData.visibleSlots > 0 ? alpha(theme.palette.success.main, 0.15) : 'grey.200',
                          color: debugData.visibleSlots > 0 ? theme.palette.success.main : 'text.secondary',
                        }}
                      />
                    </Stack>

                    <Divider sx={{ my: 0.5, opacity: 0.6 }} />

                    <Stack spacing={0.75}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Booking Mode
                        </Typography>
                        <Typography variant="caption" fontWeight={700} color="text.primary">
                          {debugData.bookingMode === 'FIXED_SLOTS' ? 'Fixed Session Slots' : 'Flexible Availability'}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Assignment Strategy
                        </Typography>
                        <Typography variant="caption" fontWeight={700} color="text.primary">
                          {debugData.assignmentStrategy === 'ROUND_ROBIN'
                            ? 'Round Robin'
                            : 'Direct Assignment'}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>

                {debugData.slots.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                    No slots configured for this date.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {debugData.slots.map((slot) => (
                      <SlotDebugRow key={slot.startTime} slot={slot} fmtTime={fmtTime} />
                    ))}
                  </Stack>
                )}
              </Stack>
            ) : null}
          </Box>
        </Box>
      )}
    </Stack>
  )
}
