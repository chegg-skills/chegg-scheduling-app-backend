import type { Control, FieldErrors } from 'react-hook-form'
import Stack from '@mui/material/Stack'
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
        canChangeActiveStatus={canChangeActiveStatus}
      />
      <UserTimezoneField control={control} errors={errors} />
      <UserZoomLinkField control={control} errors={errors} />
    </Stack>
  )
}
