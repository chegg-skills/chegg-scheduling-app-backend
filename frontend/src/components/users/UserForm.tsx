import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { z } from 'zod'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { UserPersonalFields } from './UserPersonalFields'
import { UserSystemFields } from './UserSystemFields'
import type { SafeUser, UserRole } from '@/types'
import { useUpdateUser } from '@/hooks/useUsers'
import { extractApiError } from '@/utils/apiError'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters').or(z.literal('')).optional(),
  phoneNumber: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH'] as const),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type UserFormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserFormProps {
  user: SafeUser
  currentUserRole: UserRole
  onSuccess?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserForm({ user, currentUserRole, onSuccess }: UserFormProps) {
  const { mutate, isPending, error } = useUpdateUser()

  const canChangeRole = currentUserRole === 'SUPER_ADMIN'
  const canChangeActiveStatus = currentUserRole === 'SUPER_ADMIN'

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      phoneNumber: user.phoneNumber ?? '',
      role: user.role,
      timezone: user.timezone,
      isActive: user.isActive,
    },
  })

  function onSubmit(values: UserFormValues) {
    const payload = { ...values }
    if (!payload.password) delete payload.password

    mutate(
      { userId: user.id, data: payload },
      { onSuccess },
    )
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={4}>
        {error && <ErrorAlert message={extractApiError(error)} />}

        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
            Personal Information
          </Typography>
          <UserPersonalFields register={register} errors={errors} isCreateMode={false} />
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
            Account Settings
          </Typography>
          <UserSystemFields
            register={register}
            errors={errors}
            control={control}
            canChangeRole={canChangeRole}
            canChangeActiveStatus={canChangeActiveStatus}
          />
        </Stack>

        <Stack direction="row" justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
            Save changes
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
