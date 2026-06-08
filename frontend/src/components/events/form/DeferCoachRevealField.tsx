import { useFormContext, Controller } from 'react-hook-form'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Switch } from '@/components/shared/form/Switch'
import type { EventFormValues } from './eventFormSchema'

interface DeferCoachRevealFieldProps {
  isLocked?: boolean
}

export function DeferCoachRevealField({ isLocked }: DeferCoachRevealFieldProps) {
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
            name="deferCoachReveal"
            control={control}
            render={({ field }) => (
              <Switch
                label="Defer coach reveal"
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
          : 'Students receive a booking confirmation without the coach name and join URL. Admin sends the reveal manually before the session starts.'}
      </Typography>
    </Stack>
  )
}
