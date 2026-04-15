import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { alpha } from '@mui/material/styles'
import { format, parseISO } from 'date-fns'
import type { Booking } from '@/types'

interface CalendarBookingItemProps {
  booking: Booking
  onViewDetail?: (booking: Booking) => void
  getStatusColor: (status: string) => string
}

export function CalendarBookingItem({
  booking,
  onViewDetail,
  getStatusColor,
}: CalendarBookingItemProps) {
  const statusColor = getStatusColor(booking.status)

  return (
    <Tooltip title={`${format(parseISO(booking.startTime), 'p')} - ${booking.studentName}`} arrow>
      <Box
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          onViewDetail?.(booking)
        }}
        sx={{
          px: 1,
          py: 0.6,
          borderRadius: 1.5,
          bgcolor: alpha(statusColor, 0.08),
          borderLeft: `3px solid ${statusColor}`,
          color: 'text.primary',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'translateX(2px)',
            bgcolor: alpha(statusColor, 0.12),
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: '0.675rem',
            whiteSpace: 'nowrap',
            color: statusColor,
          }}
        >
          {format(parseISO(booking.startTime), 'p')}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            fontSize: '0.675rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: 'text.primary',
          }}
        >
          {booking.studentName}
        </Typography>
      </Box>
    </Tooltip>
  )
}
