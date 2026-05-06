import { useFormContext } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Select } from '@/components/shared/form/Select'
import type { EventFormValues } from './eventFormSchema'
import type { InteractionTypeCaps } from '@/types'
import { ParticipantCapacityFields } from './ParticipantCapacityFields'
import { EventAvailabilityPicker } from './EventAvailabilityPicker'

interface EventSchedulingPolicyFieldsProps {
  caps?: InteractionTypeCaps | null
}

/**
 * Handles booking mode, weekdays, notice, buffer, and capacity fields.
 * Consumes the EventForm context.
 */
export function EventSchedulingPolicyFields({ caps }: EventSchedulingPolicyFieldsProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<EventFormValues>()
  const bookingMode = watch('bookingMode')

  const isGroupSession = !!caps?.multipleParticipants

  return (
    <Stack spacing={3}>
      {isGroupSession ? (
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
      ) : (
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
      )}

      <EventAvailabilityPicker />

      <FormField
        label="Minimum Notice (minutes)"
        htmlFor="minimumNoticeMinutes"
        error={errors.minimumNoticeMinutes?.message}
        info="How much time in advance must a booking be made? (e.g., 180 for 3 hours)."
      >
        <Input
          id="minimumNoticeMinutes"
          type="number"
          min="0"
          {...register('minimumNoticeMinutes', { valueAsNumber: true })}
        />
      </FormField>

      <FormField
        label="Buffer After Session (minutes)"
        htmlFor="bufferAfterMinutes"
        error={errors.bufferAfterMinutes?.message}
        info="Mandatory cooldown period added after each session (e.g., 15 for a 15-minute break)."
      >
        <Input
          id="bufferAfterMinutes"
          type="number"
          min="0"
          {...register('bufferAfterMinutes', { valueAsNumber: true })}
        />
      </FormField>

      <FormField
        label="Maximum Booking Window (days)"
        htmlFor="maxBookingWindowDays"
        error={errors.maxBookingWindowDays?.message}
        info="Limit how far in advance a student can book this session. Leave empty for no limit."
      >
        <Input
          id="maxBookingWindowDays"
          type="number"
          min="1"
          max="365"
          placeholder="e.g. 30"
          {...register('maxBookingWindowDays', {
            valueAsNumber: true,
            setValueAs: (v: string) => (v === '' ? null : Number(v)),
          })}
        />
      </FormField>

      {caps?.multipleParticipants && <ParticipantCapacityFields />}
    </Stack>
  )
}
