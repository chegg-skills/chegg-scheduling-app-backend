import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Select } from '@/components/shared/Select'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { useAddTeamMember } from '@/hooks/useTeamMembers'
import { useUsers } from '@/hooks/useUsers'
import { extractApiError } from '@/utils/apiError'

const schema = z.object({ userId: z.string().min(1, 'Select a user') })
type FormValues = z.infer<typeof schema>

interface AddMemberFormProps {
  teamId: string
  existingMemberIds: string[]
  onSuccess?: () => void
}

export function AddMemberForm({ teamId, existingMemberIds, onSuccess }: AddMemberFormProps) {
  const { mutate, isPending, error } = useAddTeamMember(teamId)
  const { data: usersData } = useUsers({ pageSize: 200 })

  // Only show active non-SUPER_ADMIN users not already on the team
  const eligible = (usersData?.users ?? []).filter(
    (u) => u.isActive && u.role !== 'SUPER_ADMIN' && !existingMemberIds.includes(u.id),
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  function onSubmit(values: FormValues) {
    mutate(values.userId, {
      onSuccess: () => {
        reset()
        onSuccess?.()
      },
    })
  }

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={2.5}>
      {error && <ErrorAlert message={extractApiError(error)} />}

      <FormField label="User" htmlFor="userId" error={errors.userId?.message} required>
        <Select
          id="userId"
          hasError={!!errors.userId}
          {...register('userId')}
        >
          <MenuItem value="">Select a user to add…</MenuItem>
          {eligible.map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.firstName} {u.lastName} ({u.email})
            </MenuItem>
          ))}
        </Select>
      </FormField>

      <Button type="submit" isLoading={isPending} fullWidth>
        Add member
      </Button>
    </Stack>
  )
}
