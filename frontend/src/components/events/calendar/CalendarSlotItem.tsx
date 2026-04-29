import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { alpha, useTheme } from '@mui/material/styles'
import { format, parseISO } from 'date-fns'
import type { EventScheduleSlot } from '@/types'

interface CalendarSlotItemProps {
  slot: EventScheduleSlot
  onViewDetail?: (slot: EventScheduleSlot) => void
}

const SERIES_COLORS = [
  '#2196f3', // Blue
  '#9c27b0', // Purple
  '#009688', // Teal
  '#e91e63', // Pink
  '#ff9800', // Orange
  '#673ab7', // Deep Purple
  '#3f51b5', // Indigo
  '#4caf50', // Green
  '#00bcd4', // Cyan
  '#607d8b', // Blue Grey
]

export function CalendarSlotItem({
  slot,
  onViewDetail,
}: CalendarSlotItemProps) {
  const theme = useTheme()

  const getBaseColor = () => {
    if (!slot.recurrenceGroupId) return theme.palette.primary.main
    
    // Simple hash to pick a color from the palette
    let hash = 0
    const id = slot.recurrenceGroupId
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % SERIES_COLORS.length
    return SERIES_COLORS[index]
  }

  const baseColor = getBaseColor()
  const coachName = slot.assignedCoach 
    ? `${slot.assignedCoach.firstName} ${slot.assignedCoach.lastName}`
    : 'Unassigned'

  return (
    <Tooltip title={`${format(parseISO(slot.startTime), 'p')} - ${coachName}${slot.isCancelled ? ' (Cancelled)' : ''}`} arrow>
      <Box
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          onViewDetail?.(slot)
        }}
        sx={{
          px: 1,
          py: 0.6,
          borderRadius: 1.5,
          bgcolor: alpha(baseColor, 0.08),
          borderLeft: `3px solid ${baseColor}`,
          color: 'text.primary',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'translateX(2px)',
            bgcolor: alpha(baseColor, 0.12),
          },
          opacity: slot.isCancelled ? 0.5 : 1,
          position: 'relative',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: '0.675rem',
            whiteSpace: 'nowrap',
            color: baseColor,
            textDecoration: slot.isCancelled ? 'line-through' : 'none',
          }}
        >
          {format(parseISO(slot.startTime), 'p')}
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
            textDecoration: slot.isCancelled ? 'line-through' : 'none',
          }}
        >
          {coachName}
        </Typography>
      </Box>
    </Tooltip>
  )
}
