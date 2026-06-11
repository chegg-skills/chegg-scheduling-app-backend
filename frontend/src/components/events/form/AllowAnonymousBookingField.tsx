import { useFormContext, Controller } from 'react-hook-form'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Switch } from '@/components/shared/form/Switch'
import type { EventFormValues } from './eventFormSchema'

interface AllowAnonymousBookingFieldProps {
  isLocked?: boolean
}

export function AllowAnonymousBookingField({ isLocked }: AllowAnonymousBookingFieldProps) {
  const { control } = useFormContext<EventFormValues>()

  return (
    <Stack spacing={0.5}>
      <Tooltip
        title={
          isLocked ? 'Cannot be changed after students have booked sessions for this event.' : ''
        }
        placement="top"
      >
        <span>
          <Controller
            name="allowAnonymousBooking"
            control={control}
            render={({ field }) => (
              <Switch
                label="Anonymous booking"
                checked={field.value}
                onChange={field.onChange}
                disabled={isLocked}
              />
            )}
          />
        </span>
      </Tooltip>
      <Typography
        variant="caption"
        color={isLocked ? 'text.disabled' : 'text.secondary'}
        sx={{ pl: 0.5 }}
      >
        {isLocked
          ? 'Locked — sessions have been booked under this setting.'
          : 'Students see no coach name or personal join URL at booking time. Any pool coach can log the completed session and assign themselves retroactively.'}
      </Typography>
    </Stack>
  )
}
