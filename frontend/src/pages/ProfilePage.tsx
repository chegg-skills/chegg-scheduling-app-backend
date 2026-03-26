import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { UserForm } from '@/components/users/UserForm'
import { PageSpinner } from '@/components/shared/Spinner'

export function ProfilePage() {
  const { user, isLoading, refreshUser } = useAuth()

  if (isLoading) return <PageSpinner />

  if (!user) return null

  return (
    <Box>
      <PageHeader title="My Profile" subtitle="Manage your personal information and settings." />

      <Paper variant="outlined" sx={{ mt: 3, maxWidth: 760, p: 3 }}>
        <UserForm
          user={user}
          currentUserRole={user.role}
          onSuccess={refreshUser}
        />
      </Paper>
    </Box>
  )
}
