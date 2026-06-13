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
  onTimeChange: (
    dayIndex: number,
    slotIndex: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => void
  onCopyDay: (dayIndex: number) => void
  condensed?: boolean
}

const timeInputStyle = {
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid #DEE3ED',
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
  condensed,
}: AvailabilityDayRowProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={condensed ? 2 : 2.5}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      sx={{ py: condensed ? 0.4 : 1 }}
    >
      <Box sx={{ width: condensed ? 130 : 140, display: 'flex', alignItems: 'center' }}>
        {!disabled && (
          <Switch
            checked={day.enabled}
            onChange={() => onToggleDay(dayIndex)}
            disabled={disabled}
            size="small"
          />
        )}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            ml: !disabled ? 1 : 0,
            minWidth: condensed ? 75 : 80,
            fontSize: condensed ? '0.875rem' : '0.875rem',
          }}
        >
          {dayLabel}
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        {!day.enabled ? (
          <Typography
            variant="body2"
            color="text.disabled"
            sx={{ py: condensed ? 0.25 : 1, display: 'block' }}
          >
            Unavailable
          </Typography>
        ) : (
          <Stack spacing={condensed ? 0.75 : 1}>
            {day.slots.map((slot, slotIndex) => (
              <Stack
                key={slotIndex}
                direction="row"
                spacing={condensed ? 1 : 1.25}
                alignItems="center"
              >
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(event) =>
                    onTimeChange(dayIndex, slotIndex, 'startTime', event.target.value)
                  }
                  disabled={disabled}
                  style={{
                    ...timeInputStyle,
                    ...(condensed
                      ? { padding: '4px 8px', fontSize: '0.875rem', width: '125px' }
                      : {}),
                    ...(disabled ? { border: 'none', padding: 0, width: 'auto' } : {}),
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  to
                </Typography>
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(event) =>
                    onTimeChange(dayIndex, slotIndex, 'endTime', event.target.value)
                  }
                  disabled={disabled}
                  style={{
                    ...timeInputStyle,
                    ...(condensed
                      ? { padding: '4px 8px', fontSize: '0.875rem', width: '125px' }
                      : {}),
                    ...(disabled ? { border: 'none', padding: 0, width: 'auto' } : {}),
                  }}
                />
                {!disabled && (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onRemoveSlot(dayIndex, slotIndex)}
                    disabled={disabled}
                    sx={condensed ? { p: 0.35 } : undefined}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      {day.enabled && !disabled && (
        <Stack direction="row" spacing={condensed ? 0.5 : 1}>
          <Tooltip title="Add slot">
            <IconButton
              size="small"
              color="primary"
              onClick={() => onAddSlot(dayIndex)}
              disabled={disabled}
              sx={condensed ? { p: 0.35 } : undefined}
            >
              <Plus size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Apply to other days">
            <IconButton
              size="small"
              onClick={() => onCopyDay(dayIndex)}
              disabled={disabled}
              sx={condensed ? { p: 0.35 } : undefined}
            >
              <Copy size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
    </Stack>
  )
}

