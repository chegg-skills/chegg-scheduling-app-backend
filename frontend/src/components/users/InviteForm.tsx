import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { useCreateInvite } from '@/hooks/useInvites'
import { extractApiError } from '@/utils/apiError'
import type { UserRole } from '@/types'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH'] as const),
})

type FormValues = z.infer<typeof schema>

interface InviteFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const ROLES: UserRole[] = ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH']

export function InviteForm({ onSuccess, onCancel }: InviteFormProps) {
  const { mutate, isPending, error } = useCreateInvite()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'COACH' },
  })

  function onSubmit(values: FormValues) {
    mutate(values, {
      onSuccess: () => {
        reset()
        onSuccess?.()
      },
    })
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={3}>
        {error && <ErrorAlert message={extractApiError(error)} />}

        <FormField label="Email" htmlFor="invite-email" error={errors.email?.message} required>
          <Input
            id="invite-email"
            type="email"
            placeholder="user@example.com"
            hasError={!!errors.email}
            {...register('email')}
          />
        </FormField>

        <FormField label="Role" htmlFor="invite-role" error={errors.role?.message} required>
          <Select id="invite-role" hasError={!!errors.role} {...register('role')}>
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {r.replace('_', ' ')}
              </MenuItem>
            ))}
          </Select>
        </FormField>

        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ pt: 1 }}>
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
            Send invite
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
