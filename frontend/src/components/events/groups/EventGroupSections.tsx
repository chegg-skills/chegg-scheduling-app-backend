import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Tooltip from '@mui/material/Tooltip'
import { alpha } from '@mui/material/styles'
import { Edit, Trash2, Plus, HelpCircle } from 'lucide-react'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useDeleteEventGroup } from '@/hooks/queries/useEventGroups'
import type { Event, EventGroup } from '@/types'
import { Button } from '@/components/shared/ui/Button'
import { Badge } from '@/components/shared/ui/Badge'
import { EventTable } from '../table/EventTable'
import { EventGroupFormDialog } from './EventGroupFormDialog'

interface EventGroupSectionsProps {
  groups: EventGroup[]
  events: Event[]
  teamId: string
  onViewUser?: (userId: string) => void
  canManage?: boolean
}

interface TabItem {
  id: string
  name: string
  count: number
  color: string | null
  rawGroup: EventGroup | null
}

export function EventGroupSections({
  groups,
  events,
  teamId,
  onViewUser,
  canManage = false,
}: EventGroupSectionsProps) {
  const [selectedTab, setSelectedTab] = useState<string>('all')
  const [editingGroup, setEditingGroup] = useState<EventGroup | null>(null)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const { mutate: deleteGroup } = useDeleteEventGroup(teamId)
  const { handleAction } = useAsyncAction()

  // Reset tab when team changes
  useEffect(() => {
    setSelectedTab('all')
  }, [teamId])

  const eventsByGroupId = useMemo(() => {
    const map = new Map<string | null, Event[]>()
    for (const event of events) {
      const key = event.groupId ?? null
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return map
  }, [events])

  const ungrouped = useMemo(() => eventsByGroupId.get(null) ?? [], [eventsByGroupId])

  // Build the list of available tabs dynamically
  const tabs = useMemo(() => {
    const list: TabItem[] = [
      { id: 'all', name: 'All Events', count: events.length, color: null, rawGroup: null },
    ]
    if (ungrouped.length > 0) {
      list.push({ id: 'ungrouped', name: 'Ungrouped', count: ungrouped.length, color: null, rawGroup: null })
    }
    for (const group of groups) {
      const groupEvents = eventsByGroupId.get(group.id) ?? []
      list.push({
        id: group.id,
        name: group.name,
        count: groupEvents.length,
        color: group.color,
        rawGroup: group,
      })
    }
    return list
  }, [groups, events.length, ungrouped.length, eventsByGroupId])

  // Reset to 'all' if selected group is deleted
  useEffect(() => {
    if (selectedTab !== 'all' && selectedTab !== 'ungrouped' && !groups.some((g) => g.id === selectedTab)) {
      setSelectedTab('all')
    }
  }, [groups, selectedTab])

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === selectedTab) ?? tabs[0]
  }, [tabs, selectedTab])

  const displayedEvents = useMemo(() => {
    if (activeTab.id === 'all') return events
    if (activeTab.id === 'ungrouped') return ungrouped
    return eventsByGroupId.get(activeTab.id) ?? []
  }, [activeTab.id, events, ungrouped, eventsByGroupId])

  const handleDelete = (group: EventGroup) => {
    handleAction(deleteGroup, group.id, {
      title: 'Delete group',
      message: `Delete the group "${group.name}"? This is only allowed when the group is empty — move events out first.`,
      actionName: 'Delete',
    })
  }

  const currentGroup = activeTab.rawGroup
  const themeColor = activeTab.color ?? '#E87100'

  const descriptionText = useMemo(() => {
    if (selectedTab === 'all') {
      return 'All events configured for this team are listed below. Use the dropdown above to filter events by a specific group category or manage group options.'
    }
    if (selectedTab === 'ungrouped') {
      return 'These events are not assigned to any group. Edit an event to assign it to a group or move it between groups.'
    }
    return currentGroup?.description || 'No description provided for this group. Click "Rename" to add a description or change its settings.'
  }, [selectedTab, currentGroup])

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
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: (theme) => alpha(themeColor, 0.06),
          borderColor: 'divider',
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
          {/* Left side: Group Selector Dropdown */}
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Group:
            </Typography>

            <FormControl size="small" sx={{ minWidth: 260, width: { xs: '100%', sm: 'auto' } }}>
              <Select
                value={selectedTab}
                onChange={(e) => {
                  const val = e.target.value as string
                  if (val === 'create_new') {
                    setIsCreatingGroup(true)
                  } else {
                    setSelectedTab(val)
                  }
                }}
                displayEmpty
                inputProps={{ 'aria-label': 'Select group' }}
                renderValue={(value) => {
                  const selected = tabs.find((t) => t.id === value)
                  if (!selected) return 'All Events'
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      {selected.color && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: selected.color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selected.name}
                      </Typography>
                      <Box
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          px: 0.75,
                          py: 0.1,
                          borderRadius: '8px',
                          backgroundColor: 'grey.100',
                          color: 'text.secondary',
                          ml: 'auto',
                        }}
                      >
                        {selected.count}
                      </Box>
                    </Box>
                  )
                }}
                sx={{
                  backgroundColor: 'background.paper',
                  borderRadius: 1.2,
                  height: 38,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'divider',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: themeColor,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: themeColor,
                    borderWidth: 1.5,
                  },
                }}
              >
                {tabs.map((tab) => {
                  const tabColor = tab.color ?? '#E87100'
                  return (
                    <MenuItem
                      key={tab.id}
                      value={tab.id}
                      sx={{
                        py: 1,
                        px: 2,
                        fontSize: '0.875rem',
                        fontWeight: selectedTab === tab.id ? 600 : 400,
                        '&.Mui-selected': {
                          backgroundColor: alpha(tabColor, 0.08),
                          color: tabColor,
                          fontWeight: 600,
                          '&:hover': {
                            backgroundColor: alpha(tabColor, 0.12),
                          },
                        },
                        '&:hover': {
                          backgroundColor: 'grey.50',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                        {tab.color ? (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: tab.color,
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          // Indentation alignment placeholder
                          <Box sx={{ width: 8, height: 8 }} />
                        )}
                        <Typography variant="body2">{tab.name}</Typography>
                        <Box
                          sx={{
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            px: 0.75,
                            py: 0.1,
                            borderRadius: '6px',
                            backgroundColor: selectedTab === tab.id ? alpha(tabColor, 0.12) : 'grey.100',
                            color: selectedTab === tab.id ? tabColor : 'text.secondary',
                            ml: 'auto',
                          }}
                        >
                          {tab.count}
                        </Box>
                      </Box>
                    </MenuItem>
                  )
                })}
                {canManage && (
                  <MenuItem
                    value="create_new"
                    sx={{
                      py: 1.25,
                      px: 2,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'primary.main',
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      gap: 1.25,
                      '&:hover': {
                        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
                      },
                    }}
                  >
                    <Plus size={16} />
                    Create New Group...
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            <Tooltip title={descriptionText} arrow placement="top">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  color: 'text.secondary',
                  opacity: 0.6,
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 1,
                    color: themeColor,
                    backgroundColor: alpha(themeColor, 0.08),
                  },
                  transition: 'all 0.2s',
                }}
              >
                <HelpCircle size={16} />
              </Box>
            </Tooltip>
          </Stack>

          {/* Right side: Administrative Controls */}
          {canManage && currentGroup && (
            <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingGroup(currentGroup)}
                sx={{
                  gap: 1,
                  borderRadius: 1.2,
                  color: themeColor,
                  borderColor: alpha(themeColor, 0.4),
                  '&:hover': {
                    borderColor: themeColor,
                    backgroundColor: alpha(themeColor, 0.04),
                  },
                }}
              >
                <Edit size={14} /> Rename
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDelete(currentGroup)}
                sx={{
                  gap: 1,
                  borderRadius: 1.2,
                  color: 'error.main',
                  borderColor: (theme) => alpha(theme.palette.error.main, 0.4),
                  '&:hover': {
                    borderColor: 'error.main',
                    backgroundColor: (theme) => alpha(theme.palette.error.main, 0.04),
                  },
                }}
              >
                <Trash2 size={14} /> Delete Group
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Unified Events List Table */}
      <Box sx={{ mt: 0 }}>
        <EventTable
          events={displayedEvents}
          teamId={teamId}
          onViewUser={onViewUser}
          stuckToTop
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
        <EventGroupFormDialog
          isOpen
          onClose={() => setIsCreatingGroup(false)}
          teamId={teamId}
        />
      )}
    </Box>
  )
}
