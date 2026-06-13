import { useFormContext } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import type { EventFormValues } from './eventFormSchema'
import type { InteractionTypeCaps } from '@/types'

interface BookingModeFieldProps {
  caps?: InteractionTypeCaps | null
}

export function BookingModeField({ caps }: BookingModeFieldProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<EventFormValues>()
  const bookingMode = watch('bookingMode')
  const isGroupSession = !!caps?.multipleParticipants
  const isOneToOne = caps != null && !caps.multipleParticipants && !caps.multipleCoaches

  if (isGroupSession || isOneToOne || !caps) {
    return null
  }

  return (
    <FormField
      label="Booking mode"
      htmlFor="bookingMode"
      error={errors.bookingMode?.message}
      info="Flexible: users can book any time based on coach availability. Fixed Slots: users can only book predefined sessions."
    >
      <Select
        id="bookingMode"
        value={bookingMode || 'COACH_AVAILABILITY'}
        {...register('bookingMode')}
      >
        <MenuItem value="COACH_AVAILABILITY">Flexible — based on coach availability</MenuItem>
        <MenuItem value="FIXED_SLOTS">Fixed — predefined session slots only</MenuItem>
      </Select>
    </FormField>
  )
}
