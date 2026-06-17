import { useFormContext } from 'react-hook-form'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import type { EventFormValues } from './eventFormSchema'
import type { InteractionTypeCaps } from '@/types'

interface BookingWindowFieldsProps {
  caps?: InteractionTypeCaps | null
}

export function BookingWindowFields({ caps }: BookingWindowFieldsProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<EventFormValues>()

  return (
    <>
      <FormField
        label="Minimum Notice (hours)"
        htmlFor="minimumNoticeMinutes"
        error={errors.minimumNoticeMinutes?.message}
        info="How much time in advance must a booking be made? (e.g., 3 for 3 hours)."
      >
        <Input
          id="minimumNoticeMinutes"
          type="number"
          min="0"
          step="0.5"
          placeholder="e.g. 2"
          {...register('minimumNoticeMinutes', { valueAsNumber: true })}
        />
      </FormField>

      {!caps?.multipleParticipants && (
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
            placeholder="e.g. 15"
            {...register('bufferAfterMinutes', { valueAsNumber: true })}
          />
        </FormField>
      )}

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
    </>
  )
}
