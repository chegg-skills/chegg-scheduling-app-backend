import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { useCreateTeam, useUpdateTeam } from '@/hooks/useTeams'
import { useUsers } from '@/hooks/useUsers'
import { extractApiError } from '@/utils/apiError'
import type { Team } from '@/types'
import { TeamIdentityFields } from './TeamIdentityFields'
import { TeamLeadSelector } from './TeamLeadSelector'
import { TeamStatusToggle } from './TeamStatusToggle'
import { getTeamFormDefaults, teamFormSchema, type TeamFormValues } from './teamFormSchema'

interface TeamFormProps {
  /** Pass an existing team to switch to edit mode */
  team?: Team
  onSuccess?: () => void
  onCancel?: () => void
}

export function TeamForm({ team, onSuccess, onCancel }: TeamFormProps) {
  const isEdit = Boolean(team)
  const { mutate: create, isPending: creating, error: createError } = useCreateTeam()
  const { mutate: update, isPending: updating, error: updateError } = useUpdateTeam()

  const { data: usersData } = useUsers({ pageSize: 200 })
  const teamLeadOptions = (usersData?.users ?? []).filter(
    (user) => user.role === 'TEAM_ADMIN' && user.isActive,
  )

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: getTeamFormDefaults(team),
  })

  useEffect(() => {
    reset(getTeamFormDefaults(team))
  }, [team, reset])

  function onSubmit(values: TeamFormValues) {
    if (isEdit && team) {
      update({ teamId: team.id, data: values }, { onSuccess })
      return
    }

    create(values, {
      onSuccess: () => {
        reset(getTeamFormDefaults())
        onSuccess?.()
      },
    })
  }

  function handleCancel() {
    reset(getTeamFormDefaults(team))
    onCancel?.()
  }

  const isPending = creating || updating
  const error = createError ?? updateError

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={3}>
        {error && <ErrorAlert message={extractApiError(error)} />}

        <TeamIdentityFields errors={errors} register={register} />
        <TeamLeadSelector control={control} errors={errors} teamLeadOptions={teamLeadOptions} />
        <TeamStatusToggle control={control} errors={errors} />

        <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 1 }}>
          <Button variant="secondary" type="button" onClick={handleCancel} disabled={isPending}>
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
