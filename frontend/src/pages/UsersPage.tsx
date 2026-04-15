import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import { useEffect, useState } from 'react'
import { Search, UserPlus, Users, X, GraduationCap, UserCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useUsers } from '@/hooks/useUsers'
import type { StatsTimeframe, UserRole } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Modal } from '@/components/shared/Modal'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { UserTable } from '@/components/users/UserTable'
import { InviteForm } from '@/components/users/InviteForm'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useUserStats } from '@/hooks/useStats'
import { usePagination } from '@/hooks/usePagination'

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const { pageSize, backendPage, onPageChange, onRowsPerPageChange, resetPage } = usePagination(20)
  const [showInvite, setShowInvite] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('month')
  const debouncedSearch = useDebouncedValue(searchInput, 250)

  const { data: userStats, isLoading: statsLoading } = useUserStats(timeframe)

  useEffect(() => {
    resetPage()
  }, [debouncedSearch, resetPage])

  const { data, isLoading, error } = useUsers({
    page: backendPage,
    pageSize,
    search: debouncedSearch.trim() || undefined,
  })

  const users = data?.users ?? []
  const pagination = data?.pagination

  if (isLoading && !data) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load users." />

  const userStatItems = [
    {
      label: 'New users',
      value: userStats?.metrics.newUsers ?? 0,
      helperText: 'Users added in the selected time frame',
      icon: <Users size={18} />,
      accent: 'orange' as const,
    },
    {
      label: 'Active users',
      value: userStats?.metrics.activeUsers ?? 0,
      helperText: 'Accounts currently enabled in the app',
      icon: <UserCheck size={18} />,
      accent: 'green' as const,
    },
    {
      label: 'Pending invites',
      value: userStats?.metrics.pendingInvites ?? 0,
      helperText: 'Open invitations awaiting acceptance',
      icon: <UserPlus size={18} />,
      accent: 'teal' as const,
    },
    {
      label: 'Active coaches',
      value: userStats?.metrics.coaches ?? 0,
      helperText: 'Coaches available for scheduling',
      icon: <GraduationCap size={18} />,
      accent: 'purple' as const,
    },
  ]

  return (
    <Box>
      <PageHeader
        title="Users"
        subtitle={`${pagination?.total ?? 0} total users`}
        actions={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <Box
              sx={{
                width: { xs: '100%', sm: 360 },
                maxWidth: 360,
                height: 40,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Input
                isSearch
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email"
                aria-label="Search users"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                  endAdornment: searchInput ? (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Clear user search"
                        edge="end"
                        size="small"
                        onClick={() => setSearchInput('')}
                      >
                        <X size={14} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                }}
              />
            </Box>

            <Button size="sm" onClick={() => setShowInvite(true)}>
              <UserPlus size={16} />
              Invite user
            </Button>
          </Stack>
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        <StatsOverview
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          timeframeInfo={userStats?.timeframe}
          items={userStatItems}
          isLoading={statsLoading}
        />

        <Box sx={{ mt: 3 }}>
          <UserTable
            users={users}
            pagination={pagination}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            currentUserRole={(currentUser?.role ?? 'TEAM_ADMIN') as UserRole}
            currentUserId={currentUser?.id ?? ''}
          />
        </Box>

        <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite user">
          <InviteForm
            onSuccess={() => setShowInvite(false)}
            onCancel={() => setShowInvite(false)}
          />
        </Modal>
      </Box>
    </Box>
  )
}
