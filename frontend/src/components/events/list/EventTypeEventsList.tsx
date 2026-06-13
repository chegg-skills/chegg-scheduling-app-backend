import type { MouseEvent } from 'react'
import { useState, useMemo } from 'react'
import Stack from '@mui/material/Stack'
import type { Event, EventGroup, EventType } from '@/types'
import { EmptyState } from '@/components/shared/ui/EmptyState'
import { Modal } from '@/components/shared/ui/Modal'
import { EventForm } from '../form/EventForm'
import { useDeleteEvent, useDuplicateEvent, useUpdateEvent } from '@/hooks/queries/useEvents'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { usePermissions } from '@/hooks/usePermissions'
import { toTitleCase } from '@/utils/toTitleCase'
import { EventCard } from './EventCard'
import { EventGroupHeader, type GroupEntry } from './EventGroupHeader'
import { EventActionsMenu } from './EventActionsMenu'

interface EventTypeEventsListProps {
  events: Event[]
  eventTypes: EventType[]
  selectedEventTypeId: string
  teamId: string
  onViewUser?: (userId: string) => void
  canManage?: boolean
  groups?: EventGroup[]
}

export function EventTypeEventsList({
  events,
  eventTypes,
  selectedEventTypeId,
  teamId,
  onViewUser,
  canManage = false,
  groups = [],
}: EventTypeEventsListProps) {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [activeMenuEvent, setActiveMenuEvent] = useState<Event | null>(null)

  const { canViewCoachProfile } = usePermissions()
  const { mutate: deleteEvent } = useDeleteEvent()
  const { mutate: updateEvent } = useUpdateEvent()
  const { mutate: duplicateEvent } = useDuplicateEvent()
  const { handleAction } = useAsyncAction()

  const currentEventType = useMemo(
    () => eventTypes.find((et) => et.id === selectedEventTypeId),
    [eventTypes, selectedEventTypeId]
  )

  const groupedEvents = useMemo<GroupEntry[]>(() => {
    const groupMap = new Map<string, GroupEntry>()

    events.forEach((event) => {
      const gId = event.groupId ?? 'ungrouped'
      const existing = groupMap.get(gId) ?? {
        id: gId,
        name: event.group?.name ?? 'Ungrouped Events',
        color: event.group?.color ?? null,
        events: [],
      }
      existing.events.push(event)
      groupMap.set(gId, existing)
    })

    const result: GroupEntry[] = []
    groups.forEach((g) => {
      const match = groupMap.get(g.id)
      if (match) result.push(match)
    })

    const ungrouped = groupMap.get('ungrouped')
    if (ungrouped) result.push(ungrouped)

    return result.length === 0 && groupMap.size > 0 ? Array.from(groupMap.values()) : result
  }, [events, groups])

  const handleMenuOpen = (e: MouseEvent<HTMLButtonElement>, event: Event) => {
    e.stopPropagation()
    setMenuAnchorEl(e.currentTarget)
    setActiveMenuEvent(event)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
    setActiveMenuEvent(null)
  }

  const handleToggleActive = (event: Event) => {
    const newStatus = !event.isActive
    handleAction(
      updateEvent,
      { eventId: event.id, data: { isActive: newStatus } },
      {
        title: newStatus ? 'Mark as active' : 'Mark as inactive',
        message: newStatus
          ? `Are you sure you want to mark event "${toTitleCase(event.name)}" as active?`
          : `Are you sure you want to mark event "${toTitleCase(event.name)}" as inactive?`,
        actionName: 'Update',
      }
    )
  }

  const handleDuplicate = (event: Event) => {
    handleAction(duplicateEvent, event.id, {
      title: 'Duplicate event',
      message: `Are you sure you want to create a duplicate of "${toTitleCase(event.name)}"?`,
      actionName: 'Duplicate',
    })
  }

  const handleDelete = (event: Event) => {
    handleAction(deleteEvent, event.id, {
      title: 'Delete event',
      message: `Are you sure you want to PERMANENTLY delete event "${toTitleCase(event.name)}"?`,
      actionName: 'Delete',
    })
  }

  if (events.length === 0) {
    return <EmptyState title="No events found" description="There are no events for this event type yet." />
  }

  return (
    <Stack spacing={3.5}>
      {groupedEvents.map((group) => (
        <Stack key={group.id} spacing={2}>
          {(groupedEvents.length > 1 || group.id !== 'all') && (
            <EventGroupHeader group={group} groups={groups} />
          )}
          <Stack spacing={2}>
            {(group.events as Event[]).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                accentColor={group.color ?? '#E87100'}
                currentEventType={currentEventType}
                canManage={canManage}
                canViewCoachProfile={canViewCoachProfile}
                onViewUser={onViewUser}
                onToggleActive={handleToggleActive}
                onMenuOpen={handleMenuOpen}
              />
            ))}
          </Stack>
        </Stack>
      ))}

      <EventActionsMenu
        anchorEl={menuAnchorEl}
        onClose={handleMenuClose}
        onEdit={() => {
          if (activeMenuEvent) setEditingEvent(activeMenuEvent)
          handleMenuClose()
        }}
        onDuplicate={() => {
          if (activeMenuEvent) handleDuplicate(activeMenuEvent)
          handleMenuClose()
        }}
        onDelete={() => {
          if (activeMenuEvent) handleDelete(activeMenuEvent)
          handleMenuClose()
        }}
      />

      {editingEvent && (
        <Modal
          isOpen
          size="lg"
          onClose={() => setEditingEvent(null)}
          title={`Edit "${toTitleCase(editingEvent.name)}"`}
        >
          <EventForm
            teamId={teamId}
            event={editingEvent}
            onSuccess={() => setEditingEvent(null)}
            onCancel={() => setEditingEvent(null)}
          />
        </Modal>
      )}
    </Stack>
  )
}
