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

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            mt: 2,
            mb: 3,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            aria-label="profile sections"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 48,
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab label="Profile Info" icon={<User size={18} />} iconPosition="start" />
            <Tab label="My Availability" icon={<Clock size={18} />} iconPosition="start" />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Paper variant="outlined" sx={{ mt: 3, maxWidth: 760, p: 3, borderRadius: 2 }}>
            <UserForm user={user} currentUserRole={user.role} onSuccess={refreshUser} />
          </Paper>
        )}

        {activeTab === 1 && <AvailabilityView userId={user.id} />}
      </Box>
    </Box>
  )
}
