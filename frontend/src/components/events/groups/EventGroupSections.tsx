import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import IconButton from '@mui/material/IconButton'
import { alpha } from '@mui/material/styles'
import { Edit, Trash2, Plus, HelpCircle, MoreVertical, ExternalLink, Copy, Check } from 'lucide-react'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useDeleteEventGroup } from '@/hooks/queries/useEventGroups'
import type { Event, EventGroup } from '@/types'
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
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [copied, setCopied] = useState(false)
  const { mutate: deleteGroup } = useDeleteEventGroup(teamId)
  const { handleAction } = useAsyncAction()

  const isMenuOpen = Boolean(menuAnchorEl)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
  }

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
      list.push({
        id: 'ungrouped',
        name: 'Ungrouped',
        count: ungrouped.length,
        color: null,
        rawGroup: null,
      })
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
    if (
      selectedTab !== 'all' &&
      selectedTab !== 'ungrouped' &&
      !groups.some((g) => g.id === selectedTab)
    ) {
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

  const handleCopy = async () => {
    if (currentGroup?.publicBookingSlug) {
      const shareUrl = `${window.location.origin}/book/group/${currentGroup.publicBookingSlug}`
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const descriptionText = useMemo(() => {
    if (selectedTab === 'all') {
      return 'All events configured for this team are listed below. Use the dropdown above to filter events by a specific group category or manage group options.'
    }
    if (selectedTab === 'ungrouped') {
      return 'These events are not assigned to any group. Edit an event to assign it to a group or move it between groups.'
    }
    return (
      currentGroup?.description ||
      'No description provided for this group. Click "Rename" to add a description or change its settings.'
    )
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
          {/* Left side: Group Selector Dropdown */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}
            >
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
                    borderColor: alpha(themeColor, 0.4),
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: themeColor,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: themeColor,
                    borderWidth: 1.5,
                  },
                  '& .MuiSelect-icon': {
                    color: themeColor,
                    transition: 'color 0.2s ease-in-out',
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
                            backgroundColor:
                              selectedTab === tab.id ? alpha(tabColor, 0.12) : 'grey.100',
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
                    color: 'primary.main',
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  },
                  transition: 'all 0.2s',
                }}
              >
                <HelpCircle size={16} />
              </Box>
            </Tooltip>
          </Stack>

          {/* Elegant Group Options Menu or Creation Button (aligned on the right) */}
          <Box sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
            {currentGroup ? (
              <Stack direction="row" spacing={1.25} alignItems="center">
                {/* Always show Open and Copy booking page actions when currentGroup exists */}
                <Tooltip title="Open group booking page" arrow placement="top">
                  <IconButton
                    disabled={!currentGroup.publicBookingSlug}
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/book/group/${currentGroup.publicBookingSlug}`
                      window.open(shareUrl, '_blank', 'noopener,noreferrer')
                    }}
                    sx={{
                      border: '1px solid',
                      borderColor: alpha(themeColor, 0.2),
                      borderRadius: 1.2,
                      width: 28,
                      height: 28,
                      color: themeColor,
                      bgcolor: 'transparent',
                      '&:hover': {
                        bgcolor: alpha(themeColor, 0.08),
                        color: themeColor,
                        borderColor: themeColor,
                        transform: 'scale(1.05)',
                      },
                      '&.Mui-disabled': {
                        borderColor: alpha(themeColor, 0.1),
                        color: alpha(themeColor, 0.3),
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <ExternalLink size={14} />
                  </IconButton>
                </Tooltip>

                <Tooltip title={copied ? 'Copied!' : 'Copy group booking link'} arrow placement="top">
                  <IconButton
                    disabled={!currentGroup.publicBookingSlug}
                    onClick={handleCopy}
                    sx={{
                      border: '1px solid',
                      borderColor: copied ? 'success.main' : alpha(themeColor, 0.2),
                      borderRadius: 1.2,
                      width: 28,
                      height: 28,
                      bgcolor: (theme) =>
                        copied ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                      color: (theme) => (copied ? theme.palette.success.main : themeColor),
                      '&:hover': {
                        bgcolor: (theme) =>
                          copied ? alpha(theme.palette.success.main, 0.1) : alpha(themeColor, 0.08),
                        color: (theme) => (copied ? theme.palette.success.main : themeColor),
                        borderColor: (theme) =>
                          copied ? theme.palette.success.main : themeColor,
                        transform: 'scale(1.05)',
                      },
                      '&.Mui-disabled': {
                        borderColor: alpha(themeColor, 0.1),
                        color: alpha(themeColor, 0.3),
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </IconButton>
                </Tooltip>

                {/* Only show settings menu to managers */}
                {canManage && (
                  <>
                    <Tooltip title="Group settings" arrow placement="top">
                      <IconButton
                        size="small"
                        onClick={handleMenuOpen}
                        sx={{
                          width: 28,
                          height: 28,
                          color: themeColor,
                          backgroundColor: 'transparent',
                          border: '1px solid',
                          borderColor: alpha(themeColor, 0.2),
                          '&:hover': {
                            color: themeColor,
                            backgroundColor: alpha(themeColor, 0.08),
                            borderColor: themeColor,
                            transform: 'scale(1.05)',
                          },
                          transition: 'all 0.2s ease-in-out',
                        }}
                      >
                        <MoreVertical size={16} />
                      </IconButton>
                    </Tooltip>
                    <Menu
                      anchorEl={menuAnchorEl}
                      open={isMenuOpen}
                      onClose={handleMenuClose}
                      onClick={handleMenuClose}
                      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                      PaperProps={{
                        elevation: 3,
                        sx: {
                          borderRadius: 1.2,
                          mt: 0.75,
                          minWidth: 160,
                          border: '1px solid',
                          borderColor: 'divider',
                          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
                          '& .MuiMenuItem-root': {
                            fontSize: '0.825rem',
                            py: 1,
                            px: 1.75,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.25,
                          },
                        },
                      }}
                    >
                      <MenuItem
                        onClick={() => {
                          setEditingGroup(currentGroup)
                          handleMenuClose()
                        }}
                        sx={{
                          color: 'text.primary',
                          '&:hover': {
                            backgroundColor: alpha(themeColor, 0.06),
                            color: themeColor,
                          },
                        }}
                      >
                        <Edit size={14} style={{ color: themeColor }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Rename Group
                        </Typography>
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          handleDelete(currentGroup)
                          handleMenuClose()
                        }}
                        sx={{
                          color: 'error.main',
                          '&:hover': {
                            backgroundColor: (theme) => alpha(theme.palette.error.main, 0.06),
                          },
                        }}
                      >
                        <Trash2 size={14} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Delete Group
                        </Typography>
                      </MenuItem>
                    </Menu>
                  </>
                )}
              </Stack>
            ) : (
              /* Only show "+" add group button to managers under 'all' / 'ungrouped' */
              canManage && (
                <Tooltip title="Create new event group" arrow placement="top">
                  <IconButton
                    size="small"
                    onClick={() => setIsCreatingGroup(true)}
                    sx={{
                      width: 28,
                      height: 28,
                      color: themeColor,
                      backgroundColor: 'transparent',
                      border: '1px solid',
                      borderColor: alpha(themeColor, 0.2),
                      '&:hover': {
                        color: themeColor,
                        backgroundColor: alpha(themeColor, 0.08),
                        borderColor: themeColor,
                      },
                      transition: 'all 0.2s',
                    }}
                  >
                    <Plus size={16} />
                  </IconButton>
                </Tooltip>
              )
            )}
          </Box>
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
