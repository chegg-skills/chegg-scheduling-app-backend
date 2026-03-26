import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Textarea } from '@/components/shared/Textarea'
import type { EventFormValues } from './EventForm'

interface Props {
  register: UseFormRegister<EventFormValues>
  errors: FieldErrors<EventFormValues>
}

/** Handles name and description */
export function EventBasicFields({ register, errors }: Props) {
  return (
    <Stack spacing={2}>
      <FormField label="Event Name" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" hasError={!!errors.name} {...register('name')} />
      </FormField>
      <FormField
        label="Description"
        htmlFor="description"
        error={errors.description?.message}
      >
        <Textarea id="description" {...register('description')} />
      </FormField>
    </Stack>
  )
}
