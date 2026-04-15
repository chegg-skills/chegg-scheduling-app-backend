import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import type { UserFormValues } from './userFormSchema'

interface UserZoomLinkFieldProps {
  control: Control<UserFormValues>
  errors: FieldErrors<UserFormValues>
}

export function UserZoomLinkField({ control, errors }: UserZoomLinkFieldProps) {
  return (
    <FormField
      label="Zoom ISV meeting link"
      htmlFor="zoomIsvLink"
      error={errors.zoomIsvLink?.message}
      hint="This coach-specific link is used for scheduled sessions and can be shared with learners."
    >
      <Controller
        name="zoomIsvLink"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="zoomIsvLink"
            type="url"
            placeholder="https://students.skills.chegg.com/meeting/join/..."
            value={field.value ?? ''}
            hasError={!!errors.zoomIsvLink}
          />
        )}
      />
    </FormField>
  )
}
