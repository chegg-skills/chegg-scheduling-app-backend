import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import type { EventFormValues } from './eventFormSchema'

export function BookingWindowFields() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<EventFormValues>()

  const bookingMode = watch('bookingMode')

  useEffect(() => {
    if (bookingMode !== 'FIXED_SLOTS') {
      setValue('recurrenceVisibilityLimit', null, { shouldDirty: false })
    }
  }, [bookingMode, setValue])

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

      {bookingMode === 'FIXED_SLOTS' && (
        <FormField
          label="Recurrence Visibility Limit"
          htmlFor="recurrenceVisibilityLimit"
          error={errors.recurrenceVisibilityLimit?.message}
          info="Limit how many upcoming slots in a recurring series are shown on the public booking page. Leave empty to show all."
        >
          <Input
            id="recurrenceVisibilityLimit"
            type="number"
            min="1"
            placeholder="e.g. 2"
            {...register('recurrenceVisibilityLimit', {
              valueAsNumber: true,
              setValueAs: (v: string) => (v === '' ? null : Number(v)),
            })}
          />
        </FormField>
      )}
    </>
  )
}
