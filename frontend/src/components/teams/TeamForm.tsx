import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import { z } from 'zod'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
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
  isActive: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

interface TeamFormProps {
  /** Pass an existing team to switch to edit mode */
  team?: Team
  onSuccess?: () => void
  onCancel?: () => void
}

export function TeamForm({ team, onSuccess, onCancel }: TeamFormProps) {
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
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: team?.name ?? '',
      teamLeadId: team?.teamLeadId ?? '',
      description: team?.description ?? '',
      isActive: team?.isActive ?? true,
    },
  })

  useEffect(() => {
    if (team) {
      reset({
        name: team.name,
        teamLeadId: team.teamLeadId,
        description: team.description ?? '',
        isActive: team.isActive,
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
          <Controller
            name="teamLeadId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                id="teamLeadId"
                hasError={!!errors.teamLeadId}
                renderValue={(selected) => {
                  const user = teamAdmins.find((u) => u.id === selected)
                  if (!user) return 'Select a team lead…'
                  return (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.light', color: 'primary.dark' }}>
                        {user.firstName[0]}{user.lastName[0]}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {user.firstName} {user.lastName}
                      </Typography>
                    </Stack>
                  )
                }}
              >
                <MenuItem value="">Select a team lead…</MenuItem>
                {teamAdmins.map((u) => (
                  <MenuItem key={u.id} value={u.id} sx={{ py: 1.5 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem', bgcolor: 'primary.light', color: 'primary.dark' }}>
                        {u.firstName[0]}{u.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {u.firstName} {u.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormField>

        <FormField
          label="Description"
          htmlFor="description"
          error={errors.description?.message}
        >
          <Textarea id="description" {...register('description')} />
        </FormField>

        <Box sx={{ py: 1 }}>
          <FormControlLabel
            label="Team is Active"
            control={
              <Switch
                defaultChecked={team?.isActive ?? true}
                {...register('isActive')}
              />
            }
          />
        </Box>

        <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 1 }}>
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
            {isEdit ? 'Save changes' : 'Create team'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
