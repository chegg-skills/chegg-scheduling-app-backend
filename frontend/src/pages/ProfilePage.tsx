import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { User, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { UserForm } from '@/components/users/UserForm'
import { PageSpinner } from '@/components/shared/Spinner'
import { AvailabilityView } from '@/components/availability/AvailabilityView'

export function ProfilePage() {
  const { user, isLoading, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState(0)

  if (isLoading) return <PageSpinner />
  if (!user) return null

  return (
    <Box>
      <PageHeader title="My Profile" subtitle="Manage your personal information and settings." />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab
            label="Profile Info"
            icon={<User size={18} />}
            iconPosition="start"
            sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
          />
          <Tab
            label="My Availability"
            icon={<Clock size={18} />}
            iconPosition="start"
            sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Paper variant="outlined" sx={{ mt: 3, maxWidth: 760, p: 3, borderRadius: 2 }}>
          <UserForm
            user={user}
            currentUserRole={user.role}
            onSuccess={refreshUser}
          />
        </Paper>
      )}

      {activeTab === 1 && (
        <AvailabilityView userId={user.id} />
      )}
    </Box>
  )
}
