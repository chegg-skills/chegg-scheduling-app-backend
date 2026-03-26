import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Textarea } from '@/components/shared/Textarea'
import { Select } from '@/components/shared/Select'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { useCreateTeam, useUpdateTeam } from '@/hooks/useTeams'
import { useUsers } from '@/hooks/useUsers'
import { extractApiError } from '@/utils/apiError'
import type { Team } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Team name is required'),
  teamLeadId: z.string().min(1, 'Team lead is required'),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface TeamFormProps {
  /** Pass an existing team to switch to edit mode */
  team?: Team
  onSuccess?: () => void
}

export function TeamForm({ team, onSuccess }: TeamFormProps) {
  const isEdit = !!team
  const { mutate: create, isPending: creating, error: createError } = useCreateTeam()
  const { mutate: update, isPending: updating, error: updateError } = useUpdateTeam()

  const { data: usersData } = useUsers({ pageSize: 200 })
  const teamAdmins = (usersData?.users ?? []).filter(
    (u) => u.role === 'TEAM_ADMIN' && u.isActive,
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: team?.name ?? '',
      teamLeadId: team?.teamLeadId ?? '',
      description: team?.description ?? '',
    },
  })

  useEffect(() => {
    if (team) {
      reset({
        name: team.name,
        teamLeadId: team.teamLeadId,
        description: team.description ?? '',
      })
    }
  }, [team, reset])

  function onSubmit(values: FormValues) {
    if (isEdit && team) {
      update({ teamId: team.id, data: values }, { onSuccess })
    } else {
      create(values, {
        onSuccess: () => {
          reset()
          onSuccess?.()
        },
      })
    }
  }

  const isPending = creating || updating
  const error = createError ?? updateError

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={3}>
        {error && <ErrorAlert message={extractApiError(error)} />}

        <FormField label="Team Name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" hasError={!!errors.name} {...register('name')} />
        </FormField>

        <FormField
          label="Team Lead"
          htmlFor="teamLeadId"
          error={errors.teamLeadId?.message}
          hint="Must be an active Team Admin user."
          required
        >
          <Select id="teamLeadId" hasError={!!errors.teamLeadId} {...register('teamLeadId')}>
            <MenuItem value="">Select a team lead…</MenuItem>
            {teamAdmins.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.email})
              </MenuItem>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Description"
          htmlFor="description"
          error={errors.description?.message}
        >
          <Textarea id="description" {...register('description')} />
        </FormField>

        <Stack direction="row" justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
            {isEdit ? 'Save changes' : 'Create team'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
