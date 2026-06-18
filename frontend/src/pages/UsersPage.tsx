import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useEffect, useState } from 'react'
import { useTabParam } from '@/hooks/useTabParam'
import { Search, UserPlus, Users, X, GraduationCap, UserCheck, Mail } from 'lucide-react'
import { useAuth } from '@/context/auth/useAuth'
import { useUsers } from '@/hooks/queries/useUsers'
import { useInvites } from '@/hooks/queries/useInvites'
import type { InviteStatus, StatsTimeframe, UserRole } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { Input } from '@/components/shared/form/Input'
import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { UserTable } from '@/components/users/UserTable'
import { InviteTable } from '@/components/users/InviteTable'
import { InviteFilters, type InviteFilterState } from '@/components/users/InviteFilters'
import { InviteForm } from '@/components/users/InviteForm'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useUserStats } from '@/hooks/queries/useStats'
import { usePagination } from '@/hooks/usePagination'

const USERS_TABS = ['users', 'invitations'] as const
type UsersTab = (typeof USERS_TABS)[number]

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const [activeTab, setTab] = useTabParam('tab', 'users', USERS_TABS)

  // ── Users tab state ───────────────────────────────────────────────────────
  const { pageSize, backendPage, onPageChange, onRowsPerPageChange, resetPage } = usePagination(20)
  const [showInvite, setShowInvite] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('thisMonth')
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

  // ── Invitations tab state ─────────────────────────────────────────────────
  const {
    pageSize: invPageSize,
    backendPage: invBackendPage,
    onPageChange: onInvPageChange,
    onRowsPerPageChange: onInvRowsPerPageChange,
    resetPage: resetInvPage,
  } = usePagination(20)
  const [inviteFilters, setInviteFilters] = useState<InviteFilterState>({ status: '', role: '' })

  useEffect(() => {
    resetInvPage()
  }, [inviteFilters, resetInvPage])

  const { data: inviteData, isLoading: invLoading, error: invError } = useInvites({
    status: (inviteFilters.status as InviteStatus) || undefined,
    role: (inviteFilters.role as UserRole) || undefined,
    page: invBackendPage,
    pageSize: invPageSize,
  })

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
        subtitle={
          activeTab === 'users'
            ? `${pagination?.total ?? 0} total users`
            : `${inviteData?.pagination.total ?? 0} invitations`
        }
        actions={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {activeTab === 'users' && (
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
            )}

            <Button size="sm" onClick={() => setShowInvite(true)}>
              <UserPlus size={16} />
              Invite user
            </Button>
          </Stack>
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        {isLoading && !data && activeTab === 'users' ? (
          <PageSpinner />
        ) : error && activeTab === 'users' ? (
          <Box sx={{ py: 4 }}>
            <ErrorAlert message="Failed to load users. Please refresh the page." />
          </Box>
        ) : (
          <>
            <StatsOverview
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              timeframeInfo={userStats?.timeframe}
              items={userStatItems}
              isLoading={statsLoading}
            />

            <Box
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                mt: 3,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
              }}
            >
              <Tabs
                value={activeTab}
                onChange={(_, val: string) => setTab(val as UsersTab)}
                aria-label="users page tabs"
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    minHeight: 48,
                  },
                }}
              >
                <Tab
                  value="users"
                  label="Users"
                  icon={<Users size={15} />}
                  iconPosition="start"
                />
                <Tab
                  value="invitations"
                  label="Invitations"
                  icon={<Mail size={15} />}
                  iconPosition="start"
                />
              </Tabs>

              {activeTab === 'invitations' && (
                <Box sx={{ pb: 1 }}>
                  <InviteFilters filters={inviteFilters} onChange={setInviteFilters} />
                </Box>
              )}
            </Box>

            {activeTab === 'users' && (
              <Box sx={{ mt: 2.5 }}>
                <UserTable
                  users={users}
                  pagination={pagination}
                  onPageChange={onPageChange}
                  onRowsPerPageChange={onRowsPerPageChange}
                  currentUserRole={(currentUser?.role ?? 'TEAM_ADMIN') as UserRole}
                  currentUserId={currentUser?.id ?? ''}
                />
              </Box>
            )}

            {activeTab === 'invitations' && (
              <Box sx={{ mt: 2.5 }}>
                {invLoading && !inviteData ? (
                  <PageSpinner />
                ) : invError ? (
                  <Box sx={{ py: 4 }}>
                    <ErrorAlert message="Failed to load invitations. Please refresh the page." />
                  </Box>
                ) : (
                  <InviteTable
                    invites={inviteData?.invites ?? []}
                    pagination={inviteData?.pagination}
                    onPageChange={onInvPageChange}
                    onRowsPerPageChange={onInvRowsPerPageChange}
                  />
                )}
              </Box>
            )}
          </>
        )}

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
