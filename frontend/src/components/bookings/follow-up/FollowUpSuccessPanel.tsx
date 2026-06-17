import { Box, IconButton } from '@mui/material'
import { X } from 'lucide-react'
import type { Booking } from '@/types'
import { SuccessStep } from '@/components/public/booking/SuccessStep'

interface FollowUpSuccessPanelProps {
  booking: Booking
  selectedSlot: string | null
  selectedTimezone: string
  onClose: () => void
  formatSlotWithTz: (slotIso: string) => string
}

/** Confirmation panel shown after a follow-up booking succeeds. */
export function FollowUpSuccessPanel({
  booking,
  selectedSlot,
  selectedTimezone,
  onClose,
  formatSlotWithTz,
}: FollowUpSuccessPanelProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        bgcolor: 'background.paper',
        p: 3,
        position: 'relative',
      }}
    >
      {/* Absolute Close Button */}
      <IconButton
        onClick={onClose}
        size="small"
        sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
      >
        <X size={18} />
      </IconButton>

      <SuccessStep
        email={booking.studentEmail}
        onReset={onClose}
        mode="booking"
        eventName={booking.event?.name}
        newDate={selectedSlot ? new Date(selectedSlot) : null}
        newTime={selectedSlot ? formatSlotWithTz(selectedSlot) : ''}
        mentorName={booking.coach ? `${booking.coach.firstName} ${booking.coach.lastName}` : ''}
        selectedTimezone={selectedTimezone}
        buttonLabel="Return to Bookings"
      />
    </Box>
  )
}
