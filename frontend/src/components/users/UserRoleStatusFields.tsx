import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import type { UserFormValues } from './userFormSchema'
import { USER_ROLES } from './userSystemFieldUtils'

interface UserRoleStatusFieldsProps {
  canChangeRole: boolean
  control: Control<UserFormValues>
  errors: FieldErrors<UserFormValues>
}

export function UserRoleStatusFields({
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
    </Stack>
  )
}
