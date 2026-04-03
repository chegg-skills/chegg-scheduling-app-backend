import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Textarea } from '@/components/shared/Textarea'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { InteractionTypeFormValues } from './interactionTypeFormSchema'

interface InteractionTypeBasicFieldsProps {
  errors: FieldErrors<InteractionTypeFormValues>
  isEdit: boolean
  register: UseFormRegister<InteractionTypeFormValues>
}

export function InteractionTypeBasicFields({
  errors,
  isEdit,
  register,
}: InteractionTypeBasicFieldsProps) {
  return (
    <Stack spacing={2.5}>
      <FormField
        label="Key"
        htmlFor="key"
        error={errors.key?.message}
        info="Unique identifier used for URL paths and internal references."
        hint="Unique snake_case identifier."
        required
      >
        <Input id="key" disabled={isEdit} hasError={!!errors.key} {...register('key')} />
      </FormField>

      <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" hasError={!!errors.name} {...register('name')} />
      </FormField>

      <FormField label="Description" htmlFor="description">
        <Textarea id="description" {...register('description')} />
      </FormField>

      <FormField
        label="Sort Order"
        htmlFor="sortOrder"
        info="The order in which this interaction type appears in lists (lower numbers come first)."
      >
        <Input id="sortOrder" type="number" min="0" {...register('sortOrder')} />
      </FormField>
    </Stack>
  )
}
