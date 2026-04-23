import { Controller, useFormContext } from 'react-hook-form'
import { WeeklyAvailabilityPicker } from '@/components/availability/WeeklyAvailabilityPicker'
import { FormField } from '@/components/shared/form/FormField'
import type { EventFormValues } from './eventFormSchema'

export function EventAvailabilityPicker() {
  const { control } = useFormContext<EventFormValues>()

  return (
    <FormField
      label="Weekly availability"
      info="Define specific time ranges for each weekday when this event can be booked. If empty, all times are available for the enabled days."
    >
      <Controller
        name="weeklyAvailability"
        control={control}
        defaultValue={[]}
        render={({ field }) => (
          <WeeklyAvailabilityPicker
            value={field.value}
            onChange={field.onChange}
            showFooter={false}
          />
        )}
      />
    </FormField>
  )
}
