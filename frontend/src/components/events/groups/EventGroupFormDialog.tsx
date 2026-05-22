import { useEffect, useMemo, useState } from 'react'
import Stack from '@mui/material/Stack'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Textarea } from '@/components/shared/form/Textarea'
import { useCreateEventGroup, useUpdateEventGroup, useTeamEventGroups } from '@/hooks/queries/useEventGroups'
import { extractApiError } from '@/utils/apiError'
import { GROUP_COLOR_SWATCHES, generateBeautifulRandomColor } from '@/utils/color'
import { ColorSwatchesPicker } from './ColorSwatchesPicker'
import type { EventGroup } from '@/types'

interface EventGroupFormDialogProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  group?: EventGroup
  onSuccess?: (group: EventGroup) => void
}

export function EventGroupFormDialog({
  isOpen,
  onClose,
  teamId,
  group,
  onSuccess,
}: EventGroupFormDialogProps) {
  const isEdit = !!group
  const [name, setName] = useState(group?.name ?? '')
  const [description, setDescription] = useState(group?.description ?? '')
  const [color, setColor] = useState<string | null>(group?.color ?? null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const { data: groupsList } = useTeamEventGroups(teamId)

  const { mutate: createGroup, isPending: creating, error: createError } =
    useCreateEventGroup(teamId)
  const { mutate: updateGroup, isPending: updating, error: updateError } =
    useUpdateEventGroup(teamId)

  useEffect(() => {
    if (isOpen) {
      setName(group?.name ?? '')
      setDescription(group?.description ?? '')
      setColor(group?.color ?? null)
      setValidationError(null)
    }
  }, [isOpen, group])

  const submitError = useMemo(
    () => createError ?? updateError ?? null,
    [createError, updateError]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setValidationError('Group name is required.')
      return
    }

    let finalColor = color
    if (!finalColor) {
      // Find colors that are not yet taken by any group in the team
      const existingColors = new Set(
        (groupsList ?? [])
          .filter((g) => g.id !== group?.id) // exclude the current group if editing
          .map((g) => g.color)
          .filter(Boolean)
      )

      const availableColors = GROUP_COLOR_SWATCHES.filter(
        (swatch) => !existingColors.has(swatch)
      )

      if (availableColors.length > 0) {
        // Choose a random color from the remaining unused ones among the 10
        const randomIndex = Math.floor(Math.random() * availableColors.length)
        finalColor = availableColors[randomIndex]
      } else {
        // All 10 fixed colors are already taken! Generate a beautiful random HSL color
        finalColor = generateBeautifulRandomColor()
      }
    }

    const payload = {
      name: trimmed,
      description: description.trim() || null,
      color: finalColor,
    }

    if (isEdit && group) {
      updateGroup(
        { groupId: group.id, data: payload },
        {
          onSuccess: (res) => {
            if (res.data.data) onSuccess?.(res.data.data)
            onClose()
          },
        }
      )
    } else {
      createGroup(payload, {
        onSuccess: (res) => {
          if (res.data.data) onSuccess?.(res.data.data)
          onClose()
        },
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit group' : 'New group'}
      size="sm"
    >
      <Stack
        component="form"
        spacing={3}
        onSubmit={handleSubmit}
        noValidate
        sx={{ pb: 1 }}
      >
        {(validationError || submitError) && (
          <ErrorAlert
            message={validationError ?? extractApiError(submitError)}
          />
        )}

        <FormField label="Name" htmlFor="event-group-name" required>
          <Input
            id="event-group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mentorship, Live Assessments"
            autoFocus
            hasError={!!validationError}
          />
        </FormField>

        <FormField
          label="Description"
          htmlFor="event-group-description"
          hint="Optional — helps team members understand what events go in this group."
        >
          <Textarea
            id="event-group-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>

        <FormField label="Color" htmlFor="event-group-color" hint="Optional accent color. If not selected, a random color will be auto-assigned.">
          <ColorSwatchesPicker selectedColor={color} onColorSelect={setColor} />
        </FormField>

        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button variant="secondary" type="button" onClick={onClose} disabled={creating || updating}>
            Cancel
          </Button>
          <Button type="submit" isLoading={creating || updating}>
            {isEdit ? 'Save changes' : 'Create group'}
          </Button>
        </Stack>
      </Stack>
    </Modal>
  )
}


