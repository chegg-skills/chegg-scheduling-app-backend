import { useState } from 'react'
import Stack from '@mui/material/Stack'
import MenuItem from '@mui/material/MenuItem'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import { useTeamEventGroups } from '@/hooks/queries/useEventGroups'
import { useUpdateEvent } from '@/hooks/queries/useEvents'
import { extractApiError } from '@/utils/apiError'
import type { Event } from '@/types'
import { EventGroupFormDialog } from './EventGroupFormDialog'

interface MoveEventToGroupDialogProps {
  isOpen: boolean
  onClose: () => void
  event: Event
}

const NEW_GROUP_VALUE = '__create__'
const UNASSIGNED_VALUE = '__unassigned__'

export function MoveEventToGroupDialog({
  isOpen,
  onClose,
  event,
}: MoveEventToGroupDialogProps) {
  const { data: groups = [] } = useTeamEventGroups(event.teamId)
  const { mutate: updateEvent, isPending, error } = useUpdateEvent()
  const [selection, setSelection] = useState<string>(
    event.groupId ?? UNASSIGNED_VALUE
  )
  const [showCreate, setShowCreate] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selection === NEW_GROUP_VALUE) {
      setShowCreate(true)
      return
    }

    const nextGroupId = selection === UNASSIGNED_VALUE ? null : selection
    updateEvent(
      {
        eventId: event.id,
        data: { interactionType: event.interactionType, groupId: nextGroupId },
      },
      { onSuccess: onClose }
    )
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Move event to group" size="sm">
        <Stack component="form" spacing={3} onSubmit={handleSubmit} noValidate>
          {error && <ErrorAlert message={extractApiError(error)} />}

          <FormField label="Group" htmlFor="move-event-group">
            <Select
              id="move-event-group"
              value={selection}
              onChange={(e) => setSelection(e.target.value as string)}
            >
              <MenuItem value={UNASSIGNED_VALUE}>— Ungrouped —</MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
              <MenuItem value={NEW_GROUP_VALUE}>+ Create new group…</MenuItem>
            </Select>
          </FormField>

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              {selection === NEW_GROUP_VALUE ? 'Create group…' : 'Move event'}
            </Button>
          </Stack>
        </Stack>
      </Modal>

      <EventGroupFormDialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        teamId={event.teamId}
        onSuccess={(created) => {
          setSelection(created.id)
        }}
      />
    </>
  )
}
