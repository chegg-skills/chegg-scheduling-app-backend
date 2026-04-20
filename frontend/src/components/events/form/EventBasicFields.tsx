import { useFormContext, Controller } from 'react-hook-form'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Textarea } from '@/components/shared/form/Textarea'
import { Switch } from '@/components/shared/form/Switch'
import type { EventFormValues } from './eventFormSchema'

/**
 * Handles name and description fields.
 * Consumes the EventForm context.
 */
export function EventBasicFields() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<EventFormValues>()

  return (
    <Stack spacing={3}>
      <FormField label="Event name" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" hasError={!!errors.name} {...register('name')} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" {...register('description')} />
      </FormField>

      <Controller
        name="showDescription"
        control={control}
        render={({ field }) => (
          <Switch
            label="Show description on booking page"
            checked={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </Stack>
  )
}
