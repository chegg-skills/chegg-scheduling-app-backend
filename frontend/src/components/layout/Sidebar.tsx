import { NavLink, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useAuth } from '@/context/AuthContext'
import type { UserRole } from '@/types'
import {
  LayoutDashboard,
  Users,
  UsersRound,
  CalendarDays,
  BookOpen,
  Layers,
  LogOut,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  Icon: LucideIcon
  allowedRoles: UserRole[]
}

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    Icon: LayoutDashboard,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH'],
  },
  {
    to: '/users',
    label: 'Users',
    Icon: Users,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_ADMIN'],
  },
  {
    to: '/teams',
    label: 'Teams',
    Icon: UsersRound,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_ADMIN'],
  },
  {
    to: '/events',
    label: 'Events',
    Icon: CalendarDays,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_ADMIN'],
  },
  {
    to: '/event-offerings',
    label: 'Offerings',
    Icon: BookOpen,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_ADMIN'],
  },
  {
    to: '/interaction-types',
    label: 'Interaction Types',
    Icon: Layers,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_ADMIN'],
  },
]

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  if (!user) return null

  const visibleItems = navItems.filter((item) =>
    item.allowedRoles.includes(user.role),
  )

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 260,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 260,
          boxSizing: 'border-box',
          borderRightColor: 'divider',
        },
      }}
    >
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography variant="h6" color="primary.main" fontWeight={800}>
          Scheduling App
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {visibleItems.map(({ to, label, Icon }) => {
          const selected = location.pathname === to || location.pathname.startsWith(`${to}/`)

          return (
            <ListItem key={to} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton component={NavLink} to={to} selected={selected} sx={{ borderRadius: 2 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Icon size={18} />
                </ListItemIcon>
                <ListItemText primary={label} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'primary.light',
              color: 'primary.dark',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {user.firstName[0]}
            {user.lastName[0]}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {user.firstName} {user.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user.role}
            </Typography>
          </Box>
        </Stack>
        <ListItemButton onClick={logout} sx={{ borderRadius: 2 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <LogOut size={18} />
          </ListItemIcon>
          <ListItemText primary="Sign out" primaryTypographyProps={{ variant: 'body2' }} />
        </ListItemButton>
      </Box>
    </Drawer>
  )
}
