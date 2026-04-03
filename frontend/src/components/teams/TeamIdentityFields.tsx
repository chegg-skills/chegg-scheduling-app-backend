import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Textarea } from '@/components/shared/Textarea'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { TeamFormValues } from './teamFormSchema'

interface TeamIdentityFieldsProps {
  errors: FieldErrors<TeamFormValues>
  register: UseFormRegister<TeamFormValues>
}

export function TeamIdentityFields({ errors, register }: TeamIdentityFieldsProps) {
  return (
    <>
      <FormField label="Team Name" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" hasError={!!errors.name} {...register('name')} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" {...register('description')} />
      </FormField>
    </>
  )
}
