import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import { alpha } from '@mui/material/styles'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useDeleteEventGroup } from '@/hooks/queries/useEventGroups'
import type { Event, EventGroup } from '@/types'
import { EventTable } from '../table/EventTable'
import { EventGroupFormDialog } from './EventGroupFormDialog'
import { useEventGroupTabs } from './useEventGroupTabs'
import { getGroupDescription } from './groupFormatters'
import { GroupSelector } from './GroupSelector'
import { GroupActionBar } from './GroupActionBar'

interface EventGroupSectionsProps {
  groups: EventGroup[]
  events: Event[]
  teamId: string
  onViewUser?: (userId: string) => void
  canManage?: boolean
}

export function EventGroupSections({
  groups,
  events,
  teamId,
  onViewUser,
  canManage = false,
}: EventGroupSectionsProps) {
  const [editingGroup, setEditingGroup] = useState<EventGroup | null>(null)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const { mutate: deleteGroup } = useDeleteEventGroup(teamId)
  const { handleAction } = useAsyncAction()

  const { selectedTab, setSelectedTab, tabs, activeTab, displayedEvents } = useEventGroupTabs(
    groups,
    events,
    teamId
  )

  const handleDelete = (group: EventGroup) => {
    handleAction(deleteGroup, group.id, {
      title: 'Delete group',
      message: `Delete the group "${group.name}"? This is only allowed when the group is empty — move events out first.`,
      actionName: 'Delete',
    })
  }

  const currentGroup = activeTab.rawGroup
  const themeColor = activeTab.color ?? '#E87100'

  const descriptionText = useMemo(
    () => getGroupDescription(selectedTab, currentGroup),
    [selectedTab, currentGroup]
  )

  return (
    <Box>
      {/* Unified Group Control Panel Card */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          mb: 0,
          borderRadius: 1.2,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          backgroundColor: alpha(themeColor, 0.04),
          borderColor: 'divider',
          borderBottom: '1px solid',
          borderBottomColor: alpha(themeColor, 0.35),
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ width: '100%' }}
        >
          <GroupSelector
            selectedTab={selectedTab}
            tabs={tabs}
            themeColor={themeColor}
            canManage={canManage}
            descriptionText={descriptionText}
            onSelectTab={setSelectedTab}
            onCreateNew={() => setIsCreatingGroup(true)}
          />

          <GroupActionBar
            currentGroup={currentGroup}
            themeColor={themeColor}
            canManage={canManage}
            onEdit={setEditingGroup}
            onDelete={handleDelete}
            onCreateNew={() => setIsCreatingGroup(true)}
          />
        </Stack>
      </Paper>

      {/* Unified Events List Table */}
      <Box sx={{ mt: 0 }}>
        <EventTable
          events={displayedEvents}
          teamId={teamId}
          onViewUser={onViewUser}
          stuckToTop
          groupByGroup={selectedTab === 'all'}
          groups={groups}
          canManage={canManage}
        />
      </Box>

      {/* Edit Group Dialog Modal */}
      {editingGroup && (
        <EventGroupFormDialog
          isOpen
          onClose={() => setEditingGroup(null)}
          teamId={teamId}
          group={editingGroup}
        />
      )}

      {/* Create Group Dialog Modal */}
      {isCreatingGroup && (
        <EventGroupFormDialog isOpen onClose={() => setIsCreatingGroup(false)} teamId={teamId} />
      )}
    </Box>
  )
}
