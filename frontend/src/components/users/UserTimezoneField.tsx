import { type Control, type FieldErrors } from 'react-hook-form'
import { TimezoneSelectField } from '@/components/shared/form/TimezoneSelectField'
import type { UserFormValues } from './userFormSchema'

interface UserTimezoneFieldProps {
  control: Control<UserFormValues>
  errors: FieldErrors<UserFormValues>
}

export function UserTimezoneField({ control, errors }: UserTimezoneFieldProps) {
  return (
    <TimezoneSelectField
      control={control}
      name="timezone"
      label="Timezone"
      error={errors.timezone?.message}
    />
  )
}
