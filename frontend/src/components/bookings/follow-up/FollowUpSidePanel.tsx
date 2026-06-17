import { Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { CalendarPlus } from 'lucide-react'
import type { Booking, PublicEventSummary } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'
import { PublicBookingSummary } from '@/components/public/booking/PublicBookingSummary'

interface FollowUpSidePanelProps {
  booking: Booking
  selectedDate: Date
  selectedSlot: string | null
  selectedTimezone: string
}

/** Persistent left panel showing the follow-up booking summary. */
export function FollowUpSidePanel({
  booking,
  selectedDate,
  selectedSlot,
  selectedTimezone,
}: FollowUpSidePanelProps) {
  return (
    <Box
      sx={{
        width: 380, // Matched width of PublicSidePanel
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: (theme) => alpha(theme.palette.secondary.main, 0.08),
        p: 0, // Padding set to 0 to prevent top/left spacing around the header
        height: '100%',
        overflow: 'hidden', // Set overflow to hidden to prevent scrollbar track offsets
        bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.02),
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header Content matching public booking header typography with brand background and calendar icon */}
      <Box
        sx={{
          height: 140, // Match height of PublicStepHeader exactly
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          px: 3,
          bgcolor: (theme) => theme.palette.primary.light,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ mb: 0.5, color: 'text.primary' }}
        >
          <CalendarPlus size={22} style={{ flexShrink: 0 }} />
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5, lineHeight: 1.1 }}>
            Book Follow-Up
          </Typography>
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, fontWeight: 500, lineHeight: 1.4 }}
        >
          Schedule a new session for {toTitleCase(booking.studentName)}.
        </Typography>
      </Box>

      {/* Selection summary wrapped in standard padding with local scroll wrapper */}
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', overflowY: 'auto', flexGrow: 1 }}>
        <PublicBookingSummary
          teamDetails={booking.team}
          eventDetails={booking.event as unknown as PublicEventSummary}
          coachDetails={booking.coach}
          selectedDate={selectedSlot ? new Date(selectedSlot) : selectedDate}
          selectedSlot={selectedSlot}
          selectedTimezone={selectedTimezone}
          compact
        />
      </Box>
    </Box>
  )
}
