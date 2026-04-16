import {
  LayoutDashboard,
  Users,
  UsersRound,
  CalendarDays,
  BookOpen,
  Layers,
  ClipboardList,
  GraduationCap,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/types'

export interface NavItem {
  to: string
  label: string
  Icon: LucideIcon
  allowedRoles: UserRole[]
}

export const navItems: NavItem[] = [
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
    to: '/reports',
    label: 'Reports',
    Icon: BarChart3,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_ADMIN'],
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
