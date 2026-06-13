import { useFormContext } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
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

  if (isGroupSession) {
    return (
      <FormField
        label="Booking mode"
        htmlFor="bookingModeLocked"
        info="Group sessions require students to book into pre-created slots so everyone joins the same coached session."
      >
        <Input id="bookingModeLocked" value="Fixed — predefined session slots only" disabled />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Flexible availability is not supported for group sessions — all participants must book
          into the same slot.
        </Typography>
      </FormField>
    )
  }

  if (isOneToOne) {
    return (
      <FormField
        label="Booking mode"
        htmlFor="bookingModeLocked"
        info="One-to-one sessions use coach availability so students can book any open time on the coach's schedule."
      >
        <Input id="bookingModeLocked" value="Flexible — based on coach availability" disabled />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Fixed slots are not supported for one-to-one sessions — students book directly from the
          coach&apos;s available schedule.
        </Typography>
      </FormField>
    )
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
