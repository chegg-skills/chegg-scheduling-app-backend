import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import type { UserFormValues } from './UserForm'
import type { UserRole } from '@/types'

interface Props {
  register: UseFormRegister<UserFormValues>
  errors: FieldErrors<UserFormValues>
  control: Control<UserFormValues>
  canChangeRole: boolean
  canChangeActiveStatus: boolean
}

const USER_ROLES: UserRole[] = ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH']

/** Handles role, timezone, isActive fields */
export function UserSystemFields({
  register,
  errors,
  control,
  canChangeRole,
  canChangeActiveStatus,
}: Props) {
  return (
    <Stack spacing={2}>
      <FormField label="Role" htmlFor="role" error={errors.role?.message}>
        <Select
          id="role"
          disabled={!canChangeRole}
          hasError={!!errors.role}
          {...register('role')}
        >
          {USER_ROLES.map((r) => (
            <MenuItem key={r} value={r}>
              {r.replace('_', ' ')}
            </MenuItem>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Timezone"
        htmlFor="timezone"
        error={errors.timezone?.message}
        hint="IANA timezone (e.g. America/New_York)"
      >
        <Input id="timezone" hasError={!!errors.timezone} {...register('timezone')} />
      </FormField>

      {canChangeActiveStatus && (
        <FormField label="Active Status" htmlFor="isActive" error={errors.isActive?.message}>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    id="isActive"
                    checked={field.value ?? true}
                    onChange={(e) => field.onChange(e.target.checked)}
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
