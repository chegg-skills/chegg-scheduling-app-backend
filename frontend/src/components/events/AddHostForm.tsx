import * as React from 'react'
import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Input } from '@/components/shared/Input'
import type { TeamMember, EventHost } from '@/types'
import { Button } from '@/components/shared/Button'
import { Badge } from '@/components/shared/Badge'
import { HostSelectionList } from './HostSelectionList'

interface AddHostFormProps {
    activeHosts: EventHost[]
    teamMembers: TeamMember[]
    assignmentStrategy?: string
    isPending: boolean
    onAdd: (userIds: string[]) => void
    onCancel: () => void
}

export function AddHostForm({
    activeHosts,
    teamMembers,
    assignmentStrategy,
    isPending,
    onAdd,
    onCancel,
}: AddHostFormProps) {
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [search, setSearch] = useState('')

    const currentHostUserIds = new Set(activeHosts.map((h) => h.hostUserId))
    const eligible = teamMembers.filter(
        (m) => m.isActive && m.user.role !== 'SUPER_ADMIN' && !currentHostUserIds.has(m.userId)
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
                {assignmentStrategy === 'ROUND_ROBIN' && activeHosts.length + selectedUserIds.length < 2 && (
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
                                return <Badge key={id} label={`${user.firstName} ${user.lastName}`} variant="blue" />
                            })}
                        </Box>
                    )}

                    <Input
                        isSearch
                        placeholder="Search coaches by name or email…"
                        value={search}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    />

                    <HostSelectionList
                        eligibleHosts={filteredEligible}
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
