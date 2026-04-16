import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import type { UserFormValues } from './userFormSchema'
import { USER_ROLES } from './userSystemFieldUtils'

interface UserRoleStatusFieldsProps {
  canChangeActiveStatus: boolean
  canChangeRole: boolean
  control: Control<UserFormValues>
  errors: FieldErrors<UserFormValues>
}

export function UserRoleStatusFields({
  canChangeActiveStatus,
  canChangeRole,
  control,
  errors,
}: UserRoleStatusFieldsProps) {
  return (
    <Stack spacing={2}>
      <FormField label="Role" htmlFor="role" error={errors.role?.message}>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select {...field} id="role" disabled={!canChangeRole} hasError={!!errors.role}>
              {USER_ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {role.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          )}
        />
      </FormField>

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
