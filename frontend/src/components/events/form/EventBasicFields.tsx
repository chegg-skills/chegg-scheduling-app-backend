import { useState } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import Stack from '@mui/material/Stack'
import MenuItem from '@mui/material/MenuItem'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Textarea } from '@/components/shared/form/Textarea'
import { Select } from '@/components/shared/form/Select'
import { Switch } from '@/components/shared/form/Switch'
import { useTeamEventGroups } from '@/hooks/queries/useEventGroups'
import { EventGroupFormDialog } from '../groups/EventGroupFormDialog'
import type { EventFormValues } from './eventFormSchema'

const NEW_GROUP_VALUE = '__create__'
const UNASSIGNED_VALUE = '__unassigned__'

interface EventBasicFieldsProps {
  teamId: string
}

/**
 * Handles name, description, group selection, and the show-description toggle.
 * Consumes the EventForm context.
 */
export function EventBasicFields({ teamId }: EventBasicFieldsProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<EventFormValues>()
  const { data: groups = [] } = useTeamEventGroups(teamId)
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  return (
    <Stack spacing={3}>
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
