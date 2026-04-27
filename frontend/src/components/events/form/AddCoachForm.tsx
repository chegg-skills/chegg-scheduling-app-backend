import * as React from 'react'
import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Input } from '@/components/shared/form/Input'
import type { TeamMember, EventCoach } from '@/types'
import { Button } from '@/components/shared/ui/Button'
import { Badge } from '@/components/shared/ui/Badge'
import { CoachSelectionList } from '../CoachSelectionList'

interface AddCoachFormProps {
  activeCoaches: EventCoach[]
  teamMembers: TeamMember[]
  assignmentStrategy?: string
  isPending: boolean
  onAdd: (userIds: string[]) => void
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
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="body2" color="text.secondary" mb={1}>
          Select one or more coaches to add to this event.
        </Typography>
        {assignmentStrategy === 'ROUND_ROBIN' &&
          activeCoaches.length + selectedUserIds.length < 2 && (
            <Typography
              variant="caption"
              color="error.main"
              sx={{ display: 'block', mb: 1, fontWeight: 500 }}
            >
              Note: Round Robin events require at least 2 coaches.
            </Typography>
          )}
        <Stack spacing={1.5} sx={{ width: '100%' }}>
          {selectedUserIds.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selectedUserIds.map((id) => {
                const user = teamMembers.find((m) => m.userId === id)?.user
                if (!user) return null
                return (
                  <Badge key={id} label={`${user.firstName} ${user.lastName}`} color="blue" />
                )
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
          />
        </Stack>
      </Box>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => onAdd(selectedUserIds)}
          isLoading={isPending}
          disabled={selectedUserIds.length === 0}
        >
          Add coaches
        </Button>
      </Stack>
    </Stack>
  )
}
