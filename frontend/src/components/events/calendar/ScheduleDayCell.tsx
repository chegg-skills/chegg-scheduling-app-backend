import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import { alpha, useTheme } from '@mui/material/styles'
import { format } from 'date-fns'
import type { EventScheduleSlot } from '@/types'
import { CalendarSlotItem } from './CalendarSlotItem'

interface ScheduleDayCellProps {
  day: Date
  isCurrentMonth: boolean
  isToday: boolean
  slots: EventScheduleSlot[]
  onViewDetail?: (slot: EventScheduleSlot) => void
}

export function ScheduleDayCell({
  day,
  isCurrentMonth,
  isToday,
  slots,
  onViewDetail,
}: ScheduleDayCellProps) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        minHeight: { xs: 100, md: 160 },
        bgcolor: !isCurrentMonth ? alpha(theme.palette.text.disabled, 0.03) : 'background.paper',
        transition: 'all 0.2s',
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
        '&:hover': {
          bgcolor: isCurrentMonth
            ? alpha(theme.palette.primary.main, 0.02)
            : alpha(theme.palette.text.disabled, 0.05),
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1.5,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: isToday ? 900 : 600,
            color: isToday ? 'white' : !isCurrentMonth ? 'text.disabled' : 'text.primary',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            bgcolor: isToday ? 'primary.main' : 'transparent',
            boxShadow: isToday ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.4)}` : 'none',
          }}
        >
          {format(day, 'd')}
        </Typography>
        {slots.length > 0 && (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              bgcolor: alpha(theme.palette.text.secondary, 0.08),
              px: 0.8,
              py: 0.2,
              borderRadius: 1,
            }}
          >
            {slots.length}
          </Typography>
        )}
      </Box>

      <Stack spacing={0.8} sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: { xs: 60, md: 120 } }}>
        {slots.slice(0, 4).map((slot) => (
          <CalendarSlotItem key={slot.id} slot={slot} onViewDetail={onViewDetail} />
        ))}
        {slots.length > 4 && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', pl: 1, fontWeight: 700, fontSize: '0.65rem' }}
          >
            + {slots.length - 4} more
          </Typography>
        )}
      </Stack>
    </Box>
  )
}
