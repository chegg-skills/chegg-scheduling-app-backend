import * as React from 'react'
import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Checkbox from '@mui/material/Checkbox'
import { Input } from '@/components/shared/form/Input'
import type { TeamMember, EventCoach, SetWeeklyAvailabilityDto } from '@/types'
import { Button } from '@/components/shared/ui/Button'
import { Badge } from '@/components/shared/ui/Badge'
import { CoachSelectionList } from '../CoachSelectionList'
import { WeeklyAvailabilityPicker } from '@/components/availability/WeeklyAvailabilityPicker'
import { useWeeklyAvailability } from '@/hooks/queries/useAvailability'

interface AddCoachFormProps {
  activeCoaches: EventCoach[]
  teamMembers: TeamMember[]
  assignmentStrategy?: string
  isPending: boolean
  onAdd: (
    userIds: string[],
    customSchedules?: Record<string, SetWeeklyAvailabilityDto>,
    hasCustomSchedule?: Record<string, boolean>
  ) => void
  onCancel: () => void
}

export function AddCoachForm({
  activeCoaches,
  teamMembers,
  assignmentStrategy,
  isPending,
  onAdd,
  onCancel,
}: AddCoachFormProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [activeCoachId, setActiveCoachId] = useState<string | null>(null)
  const [customSchedules, setCustomSchedules] = useState<Record<string, SetWeeklyAvailabilityDto>>({})
  const [hasCustomSchedule, setHasCustomSchedule] = useState<Record<string, boolean>>({})
  const [applyToAll, setApplyToAll] = useState(false)

  const currentCoachUserIds = new Set(activeCoaches.map((c) => c.coachUserId))
  const eligible = teamMembers.filter(
    (m) => m.isActive && m.user.role !== 'SUPER_ADMIN' && !currentCoachUserIds.has(m.userId)
  )

  const filteredEligible = eligible.filter((m) =>
    `${m.user.firstName} ${m.user.lastName} ${m.user.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const handleToggle = (userId: string) => {
    setSelectedUserIds((prev) => {
      const isSelected = prev.includes(userId)
      const next = isSelected ? prev.filter((id) => id !== userId) : [...prev, userId]

      if (isSelected && activeCoachId === userId) {
        const remaining = next.filter((id) => id !== userId)
        setActiveCoachId(remaining.length > 0 ? remaining[0] : null)
      } else if (!isSelected) {
        // If applyToAll is true and we selected a new coach, copy the current active coach's settings
        if (applyToAll && activeCoachId) {
          const activeSlots = customSchedules[activeCoachId] ?? []
          const activeOverride = hasCustomSchedule[activeCoachId] ?? false
          setCustomSchedules((prevSchedules) => ({
            ...prevSchedules,
            [userId]: [...activeSlots],
          }))
          setHasCustomSchedule((prevOverrides) => ({
            ...prevOverrides,
            [userId]: activeOverride,
          }))
        }
        setActiveCoachId(userId)
      }
      return next
    })
  }

  const handleSelectCoach = (userId: string) => {
    setActiveCoachId(userId)
  }

  // Load the selected coach's global availability to pre-populate custom availability slots
  const { data: globalWeeklyAvailability, isLoading: isLoadingAvailability } = useWeeklyAvailability(
    activeCoachId || ''
  )

  useEffect(() => {
    if (activeCoachId && globalWeeklyAvailability && !customSchedules[activeCoachId]) {
      setCustomSchedules((prev) => ({
        ...prev,
        [activeCoachId]: globalWeeklyAvailability.map(({ dayOfWeek, startTime, endTime }) => ({
          dayOfWeek,
          startTime,
          endTime,
        })),
      }))
    }
  }, [activeCoachId, globalWeeklyAvailability, customSchedules])

  const handleToggleOverride = (checked: boolean) => {
    if (activeCoachId) {
      setHasCustomSchedule((prev) => {
        const next = { ...prev, [activeCoachId]: checked }
        if (applyToAll) {
          selectedUserIds.forEach((id) => {
            next[id] = checked
          })
        }
        return next
      })
    }
  }

  const handleAvailabilityChange = (newSlots: SetWeeklyAvailabilityDto) => {
    if (activeCoachId) {
      setCustomSchedules((prev) => {
        const next = { ...prev, [activeCoachId]: newSlots }
        if (applyToAll) {
          selectedUserIds.forEach((id) => {
            next[id] = newSlots
          })
        }
        return next
      })
    }
  }

  const handleToggleApplyToAll = (checked: boolean) => {
    setApplyToAll(checked)
    if (checked && activeCoachId) {
      const activeSlots = customSchedules[activeCoachId] ?? []
      const activeOverride = hasCustomSchedule[activeCoachId] ?? false

      setCustomSchedules((prev) => {
        const next = { ...prev }
        selectedUserIds.forEach((id) => {
          next[id] = [...activeSlots]
        })
        return next
      })

      setHasCustomSchedule((prev) => {
        const next = { ...prev }
        selectedUserIds.forEach((id) => {
          next[id] = activeOverride
        })
        return next
      })
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Select one or more coaches to add to this event.
        </Typography>
        {assignmentStrategy === 'ROUND_ROBIN' &&
          activeCoaches.length + selectedUserIds.length < 2 && (
            <Typography
              variant="caption"
              color="error.main"
              sx={{ display: 'block', mb: 2, fontWeight: 500 }}
            >
              Note: Round Robin events require at least 2 coaches.
            </Typography>
          )}

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left Column */}
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Stack spacing={1.5}>
              {selectedUserIds.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selectedUserIds.map((id) => {
                    const user = teamMembers.find((m) => m.userId === id)?.user
                    if (!user) return null
                    return <Badge key={id} label={`${user.firstName} ${user.lastName}`} color="blue" />
                  })}
                </Box>
              )}

              <Input
                isSearch
                placeholder="Search coaches by name or email…"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />

              <CoachSelectionList
                eligibleCoaches={filteredEligible}
                selectedUserIds={selectedUserIds}
                onToggle={handleToggle}
                activeCoachId={activeCoachId}
                onSelectCoach={handleSelectCoach}
              />
            </Stack>
          </Box>

          {/* Vertical Divider */}
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Right Column */}
          <Box sx={{ flex: 1.2, minWidth: 320 }}>
            {activeCoachId ? (
              (() => {
                const activeMember = teamMembers.find((m) => m.userId === activeCoachId)
                const coachName = activeMember ? `${activeMember.user.firstName} ${activeMember.user.lastName}` : ''
                const isOverridden = hasCustomSchedule[activeCoachId] ?? false
                return (
                  <Stack spacing={2}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {applyToAll ? 'Custom Availability — All Selected Coaches' : `Custom Availability — ${coachName}`}
                    </Typography>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={isOverridden}
                          onChange={(e) => handleToggleOverride(e.target.checked)}
                          disabled={isPending}
                        />
                      }
                      label="Override global weekly availability"
                    />

                    {selectedUserIds.length > 1 && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={applyToAll}
                            onChange={(e) => handleToggleApplyToAll(e.target.checked)}
                            disabled={isPending}
                            size="small"
                          />
                        }
                        label="Apply this availability override to all selected coaches"
                        sx={{ mt: -0.5 }}
                      />
                    )}

                    {isOverridden && (
                      <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                        {applyToAll
                          ? "This custom availability will override all selected coaches' global profile availability for this event."
                          : `This custom availability will override ${coachName}'s global profile availability for this event.`}
                      </Alert>
                    )}

                    {isOverridden ? (
                      isLoadingAvailability && !customSchedules[activeCoachId] ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : (
                        <Box sx={{ maxHeight: 280, overflowY: 'auto', pr: 1 }}>
                          <WeeklyAvailabilityPicker
                            value={customSchedules[activeCoachId] ?? []}
                            onChange={handleAvailabilityChange}
                            disabled={isPending}
                            showFooter={false}
                          />
                        </Box>
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        This coach will use their global weekly schedule. Toggle the option above to customize their schedule for this event only.
                      </Typography>
                    )}
                  </Stack>
                )
              })()
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, color: 'text.secondary', px: 2, textAlign: 'center' }}>
                <Typography variant="body2">
                  Select a coach from the list to view or customize their schedule for this event.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => onAdd(selectedUserIds, customSchedules, hasCustomSchedule)}
          isLoading={isPending}
          disabled={selectedUserIds.length === 0}
        >
          Add coaches
        </Button>
      </Stack>
    </Stack>
  )
}
