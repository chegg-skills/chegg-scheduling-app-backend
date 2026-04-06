import type { CSSProperties } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Copy, Plus, Trash2 } from 'lucide-react'
import type { DayAvailability } from './availabilityPickerUtils'

interface AvailabilityDayRowProps {
  dayLabel: string
  dayIndex: number
  day: DayAvailability
  disabled?: boolean
  onToggleDay: (dayIndex: number) => void
  onAddSlot: (dayIndex: number) => void
  onRemoveSlot: (dayIndex: number, slotIndex: number) => void
  onTimeChange: (dayIndex: number, slotIndex: number, field: 'startTime' | 'endTime', value: string) => void
  onCopyDay: (dayIndex: number) => void
}

const timeInputStyle = {
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid #ccc',
  background: 'transparent',
  color: 'inherit',
  fontSize: '0.875rem',
} satisfies CSSProperties

export function AvailabilityDayRow({
  dayLabel,
  dayIndex,
  day,
  disabled,
  onToggleDay,
  onAddSlot,
  onRemoveSlot,
  onTimeChange,
  onCopyDay,
}: AvailabilityDayRowProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
      sx={{ py: 1 }}
    >
      <Box sx={{ width: 120, display: 'flex', alignItems: 'center' }}>
        <Switch
          checked={day.enabled}
          onChange={() => onToggleDay(dayIndex)}
          disabled={disabled}
          size="small"
        />
        <Typography variant="body2" sx={{ fontWeight: 600, ml: 1, minWidth: 80 }}>
          {dayLabel}
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        {!day.enabled ? (
          <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
            Unavailable
          </Typography>
        ) : (
          <Stack spacing={1}>
            {day.slots.map((slot, slotIndex) => (
              <Stack key={slotIndex} direction="row" spacing={1} alignItems="center">
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(event) => onTimeChange(dayIndex, slotIndex, 'startTime', event.target.value)}
                  disabled={disabled}
                  style={timeInputStyle}
                />
                <Typography variant="body2" color="text.secondary">
                  to
                </Typography>
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(event) => onTimeChange(dayIndex, slotIndex, 'endTime', event.target.value)}
                  disabled={disabled}
                  style={timeInputStyle}
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onRemoveSlot(dayIndex, slotIndex)}
                  disabled={disabled}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      {day.enabled && (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Add slot">
            <IconButton size="small" color="primary" onClick={() => onAddSlot(dayIndex)} disabled={disabled}>
              <Plus size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Apply to other days">
            <IconButton size="small" onClick={() => onCopyDay(dayIndex)} disabled={disabled}>
              <Copy size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
    </Stack>
  )
}
