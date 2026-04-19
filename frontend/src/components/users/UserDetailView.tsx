import React from 'react'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { Calendar, Clock, Users } from 'lucide-react'
import type { UserWithDetails } from '@/types'
import { AvailabilityView } from '@/components/availability/AvailabilityView'
import { UserCoachedEventsTab } from './UserCoachedEventsTab'
import { UserProfileHeader } from './UserProfileHeader'
import { UserTeamsTab } from './UserTeamsTab'

interface UserDetailViewProps {
  user: UserWithDetails
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export function UserDetailView({ user }: UserDetailViewProps) {
  const [tabValue, setTabValue] = React.useState(0)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  return (
    <Box>
      <UserProfileHeader user={user} />

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="user detail sections"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mt: 2,
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
        <Tab label="Teams" icon={<Users size={18} />} iconPosition="start" />
        <Tab label="Events" icon={<Calendar size={18} />} iconPosition="start" />
        <Tab label="Availability" icon={<Clock size={18} />} iconPosition="start" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <UserTeamsTab user={user} />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <UserCoachedEventsTab user={user} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <AvailabilityView userId={user.id} />
      </TabPanel>
    </Box>
  )
}
