import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import { Button } from '@/components/shared/ui/Button'
import type { SetWeeklyAvailabilityDto } from '@/types'
import { AvailabilityDayRow } from './AvailabilityDayRow'
import { DAYS } from './availabilityPickerUtils'
import { useWeeklyAvailability } from './useWeeklyAvailability'

interface WeeklyAvailabilityPickerProps {
  value: SetWeeklyAvailabilityDto
  onChange: (value: SetWeeklyAvailabilityDto) => void
  disabled?: boolean
  showFooter?: boolean
  condensed?: boolean
}

export function WeeklyAvailabilityPicker({
  value,
  onChange,
  disabled,
  showFooter,
  condensed,
}: WeeklyAvailabilityPickerProps) {
  const {
    days,
    handleToggleDay,
    handleAddSlot,
    handleRemoveSlot,
    handleTimeChange,
    handleCopyDay,
    handleReset,
    handleSave,
  } = useWeeklyAvailability({ value, onChange, showFooter })

  return (
    <Box>
      <Stack
        spacing={condensed ? 0.75 : 2}
        divider={<Divider sx={condensed ? { my: 0.3, opacity: 0.8 } : undefined} />}
      >
        {days.map((day, index) => (
          <AvailabilityDayRow
            key={DAYS[index]}
            dayLabel={DAYS[index]}
            dayIndex={index}
            day={day}
            disabled={disabled}
            onToggleDay={handleToggleDay}
            onAddSlot={handleAddSlot}
            onRemoveSlot={handleRemoveSlot}
            onTimeChange={handleTimeChange}
            onCopyDay={handleCopyDay}
            condensed={condensed}
          />
        ))}
      </Stack>

      {showFooter !== false && (
        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
          }}
        >
          <Button variant="secondary" onClick={handleReset} disabled={disabled}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={disabled}
            disabled={disabled}
            sx={{ minWidth: 160 }}
          >
            Save changes
          </Button>
        </Box>
      )}
    </Box>
  )
}
