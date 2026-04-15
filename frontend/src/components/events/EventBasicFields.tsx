import { useFormContext } from 'react-hook-form'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Textarea } from '@/components/shared/Textarea'
import type { EventFormValues } from './eventFormSchema'

/**
 * Handles name and description fields.
 * Consumes the EventForm context.
 */
export function EventBasicFields() {
  const {
    register,
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
    </Stack>
  )
}
