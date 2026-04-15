import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { useUpdateUser, useUpdateMyProfile } from '@/hooks/useUsers'
import { useAuth } from '@/context/AuthContext'
import { extractApiError } from '@/utils/apiError'
import type { SafeUser, UserRole } from '@/types'
import { UserFormActionBar } from './UserFormActionBar'
import { UserFormSection } from './UserFormSection'
import { UserPersonalFields } from './UserPersonalFields'
import { UserSystemFields } from './UserSystemFields'
import { getUserFormDefaults, userFormSchema, type UserFormValues } from './userFormSchema'

interface UserFormProps {
  user: SafeUser
  currentUserRole: UserRole
  onSuccess?: () => void
  onCancel?: () => void
}

export function UserForm({ user, currentUserRole, onSuccess, onCancel }: UserFormProps) {
  const { user: authUser } = useAuth()
  const updateAdmin = useUpdateUser()
  const updateSelf = useUpdateMyProfile()

  const isSelf = user.id === authUser?.id
  const canChangeRole = currentUserRole === 'SUPER_ADMIN'
  const canChangeActiveStatus = currentUserRole === 'SUPER_ADMIN'

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: getUserFormDefaults(user),
  })

  useEffect(() => {
    reset(getUserFormDefaults(user))
  }, [user, reset])

  function onSubmit(values: UserFormValues) {
    const payload = { ...values }
    if (!payload.password) delete payload.password

    if (isSelf) {
      const { email: _email, role: _role, isActive: _isActive, ...selfPayload } = payload
      updateSelf.mutate(selfPayload, { onSuccess })
      return
    }

    updateAdmin.mutate({ userId: user.id, data: payload }, { onSuccess })
  }

  function handleCancel() {
    reset(getUserFormDefaults(user))
    onCancel?.()
  }

  const isPending = updateAdmin.isPending || updateSelf.isPending
  const error = updateAdmin.error || updateSelf.error

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={4}>
        {error && <ErrorAlert message={extractApiError(error)} />}

        <UserFormSection title="Personal information">
          <UserPersonalFields
            register={register}
            errors={errors}
            control={control}
            isCreateMode={false}
            disabledFields={{ email: isSelf }}
          />
        </UserFormSection>

        <Divider />

        <UserFormSection title="Account settings">
          <UserSystemFields
            errors={errors}
            control={control}
            canChangeRole={canChangeRole}
            canChangeActiveStatus={canChangeActiveStatus}
          />
        </UserFormSection>

        <UserFormActionBar isPending={isPending} onCancel={handleCancel} />
      </Stack>
    </Box>
  )
}
