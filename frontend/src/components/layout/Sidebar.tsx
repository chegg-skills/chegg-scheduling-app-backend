import { NavLink, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
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
  User,
  ClipboardList,
  GraduationCap,
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
    to: '/bookings',
    label: 'Bookings',
    Icon: ClipboardList,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH'],
  },
  {
    to: '/students',
    label: 'Students',
    Icon: GraduationCap,
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
          borderRadius: 0,
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
        <ListItemButton component={NavLink} to="/profile" sx={{ borderRadius: 2, mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <User size={18} />
          </ListItemIcon>
          <ListItemText primary="Profile" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
        </ListItemButton>
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
