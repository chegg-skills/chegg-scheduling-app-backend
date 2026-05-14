import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/form/FormField'
import type { UserFormValues } from './userFormSchema'
import { UserRoleStatusFields } from './UserRoleStatusFields'
import { UserTimezoneField } from './UserTimezoneField'
import { UserZoomLinkField } from './UserZoomLinkField'

interface UserSystemFieldsProps {
  errors: FieldErrors<UserFormValues>
  control: Control<UserFormValues>
  canChangeRole: boolean
  canChangeActiveStatus: boolean
}

/** Handles role, timezone, isActive fields */
export function UserSystemFields({
  errors,
  control,
  canChangeRole,
  canChangeActiveStatus,
}: UserSystemFieldsProps) {
  return (
    <Stack spacing={2}>
      <UserRoleStatusFields
        control={control}
        errors={errors}
        canChangeRole={canChangeRole}
      />
      <UserTimezoneField control={control} errors={errors} />
      <UserZoomLinkField control={control} errors={errors} />

      {canChangeActiveStatus && (
        <FormField label="Active status" htmlFor="isActive" error={errors.isActive?.message}>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    id="isActive"
                    checked={field.value ?? true}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                }
                label="Account is active"
              />
            )}
          />
        </FormField>
      )}
    </Stack>
  )
}
