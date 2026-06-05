import { Controller, useFormContext } from 'react-hook-form'
import { WeeklyAvailabilityPicker } from '@/components/availability/WeeklyAvailabilityPicker'
import { FormField } from '@/components/shared/form/FormField'
import { TimezoneSelectField } from '@/components/shared/form/TimezoneSelectField'
import type { EventFormValues } from './eventFormSchema'

export function EventAvailabilityPicker() {
  const { control } = useFormContext<EventFormValues>()

  return (
    <>
      <TimezoneSelectField
        control={control}
        name="timezone"
        label="Availability timezone"
        hint="All times in the availability grid below are interpreted in this timezone."
      />

      <FormField
        htmlFor="weekly-availability"
        label="Weekly availability"
        info="Optionally restrict when this event can be booked on each day. This works on top of each coach's own availability — a slot is only shown to students when the coach is available AND the time falls within these windows. Leave empty to use the coach's full availability without additional restrictions."
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
    </>
  )
}
