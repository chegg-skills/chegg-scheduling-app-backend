import { useState, useMemo } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import Stack from '@mui/material/Stack'
import MenuItem from '@mui/material/MenuItem'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Textarea } from '@/components/shared/form/Textarea'
import { Select } from '@/components/shared/form/Select'
import { Switch } from '@/components/shared/form/Switch'
import { useTeamEventGroups } from '@/hooks/queries/useEventGroups'
import { useTeams } from '@/hooks/queries/useTeams'
import { EventGroupFormDialog } from '../groups/EventGroupFormDialog'
import type { EventFormValues } from './eventFormSchema'

const NEW_GROUP_VALUE = '__create__'
const UNASSIGNED_VALUE = '__unassigned__'

interface EventBasicFieldsProps {
  teamId: string
  showTeamSelect?: boolean
}

/**
 * Handles name, description, group selection, and the show-description toggle.
 * Consumes the EventForm context.
 */
export function EventBasicFields({ teamId, showTeamSelect = false }: EventBasicFieldsProps) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<EventFormValues>()
  const { data: groups = [] } = useTeamEventGroups(teamId)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const { data: teamsData } = useTeams()

  const sortedTeams = useMemo(() => {
    if (!teamsData?.teams) return []
    return [...teamsData.teams].sort((a, b) => a.name.localeCompare(b.name))
  }, [teamsData?.teams])

  return (
    <Stack spacing={3}>
      {showTeamSelect && (
        <Controller
          name="teamId"
          control={control}
          render={({ field }) => (
            <FormField
              label="Team"
              htmlFor="teamId"
              error={errors.teamId?.message}
              required
              hint="Select the team this event belongs to."
            >
              <Select
                id="teamId"
                value={field.value ?? ''}
                inputProps={{ 'aria-label': 'Team' }}
                onChange={(e) => {
                  field.onChange(e.target.value)
                  setValue('groupId', null) // Reset group when team changes
                }}
              >
                <MenuItem value="" disabled>Choose a team...</MenuItem>
                {sortedTeams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormField>
          )}
        />
      )}
      <FormField label="Event name" htmlFor="name" error={errors.name?.message} required>
        <Input id="name" hasError={!!errors.name} {...register('name')} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" {...register('description')} />
      </FormField>

      <Controller
        name="groupId"
        control={control}
        render={({ field }) => (
          <>
            <FormField
              label="Group"
              htmlFor="event-group"
              hint="Optional — organize related events into a group on the Events page."
            >
              <Select
                id="event-group"
                value={field.value ?? UNASSIGNED_VALUE}
                onChange={(e) => {
                  const value = e.target.value as string
                  if (value === NEW_GROUP_VALUE) {
                    setShowCreateGroup(true)
                    return
                  }
                  field.onChange(value === UNASSIGNED_VALUE ? null : value)
                }}
              >
                <MenuItem value={UNASSIGNED_VALUE}>— None —</MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
                <MenuItem value={NEW_GROUP_VALUE}>+ Create new group…</MenuItem>
              </Select>
            </FormField>
            <EventGroupFormDialog
              isOpen={showCreateGroup}
              onClose={() => setShowCreateGroup(false)}
              teamId={teamId}
              onSuccess={(created) => field.onChange(created.id)}
            />
          </>
        )}
      />

      <Controller
        name="showDescription"
        control={control}
        render={({ field }) => (
          <Switch
            label="Show description on booking page"
            checked={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </Stack>
  )
}
