import { useFormContext } from 'react-hook-form'
import { FormField } from '@/components/shared/form/FormField'
import { QuickSelectInput } from '@/components/shared/form/QuickSelectInput'
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
        <QuickSelectInput
          id="minimumNoticeMinutes"
          type="number"
          min="0"
          step="0.5"
          placeholder="e.g. 2"
          options={[
            { label: '3 hr', value: 3 },
            { label: '6 hr', value: 6 },
            { label: '12 hr', value: 12 },
            { label: '24 hr', value: 24 },
          ]}
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
          <QuickSelectInput
            id="bufferAfterMinutes"
            type="number"
            min="0"
            placeholder="e.g. 15"
            options={[
              { label: '0 min', value: 0 },
              { label: '10 min', value: 10 },
              { label: '15 min', value: 15 },
              { label: '30 min', value: 30 },
            ]}
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
        <QuickSelectInput
          id="maxBookingWindowDays"
          type="number"
          min="1"
          max="365"
          placeholder="e.g. 30"
          options={[
            { label: 'No Limit', value: null },
            { label: '30 days', value: 30 },
            { label: '45 days', value: 45 },
            { label: '60 days', value: 60 },
            { label: '90 days', value: 90 },
          ]}
          {...register('maxBookingWindowDays', {
            valueAsNumber: true,
            setValueAs: (v: string) => (v === '' ? null : Number(v)),
          })}
        />
      </FormField>
    </>
  )
}

