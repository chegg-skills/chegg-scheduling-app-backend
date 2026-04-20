import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { alpha, useTheme } from '@mui/material/styles'
import { format } from 'date-fns'

export type UserCalendarEventType = 'BOOKING' | 'AVAILABILITY' | 'BLOCKAGE'

export interface UserCalendarEvent {
    id: string
    type: UserCalendarEventType
    title: string
    startTime: Date
    endTime: Date
    status?: string // for bookings
}

interface UserCalendarItemProps {
    event: UserCalendarEvent
    onClick?: (event: UserCalendarEvent) => void
}

export function UserCalendarItem({ event, onClick }: UserCalendarItemProps) {
    const theme = useTheme()

    const getColor = () => {
        switch (event.type) {
            case 'BOOKING':
                return theme.palette.primary.main // Blue
            case 'AVAILABILITY':
                return theme.palette.success.main // Green
            case 'BLOCKAGE':
                return theme.palette.error.main // Red/Orange
            default:
                return theme.palette.text.secondary
        }
    }

    const color = getColor()
    const timeStr = format(event.startTime, 'p')

    return (
        <Tooltip title={`${event.type}: ${event.title} (${timeStr})`} arrow>
            <Box
                onClick={(e: React.MouseEvent) => {
                    if (onClick) {
                        e.stopPropagation()
                        onClick(event)
                    }
                }}
                sx={{
                    px: 1,
                    py: 0.4,
                    borderRadius: 1,
                    bgcolor: alpha(color, 0.08),
                    borderLeft: `3px solid ${color}`,
                    color: 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.8,
                    cursor: onClick ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    '&:hover': onClick ? {
                        transform: 'translateX(2px)',
                        bgcolor: alpha(color, 0.12),
                    } : {},
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 700,
                        fontSize: '0.625rem',
                        whiteSpace: 'nowrap',
                        color: color,
                    }}
                >
                    {timeStr}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        fontSize: '0.625rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {event.title}
                </Typography>
            </Box>
        </Tooltip>
    )
}
