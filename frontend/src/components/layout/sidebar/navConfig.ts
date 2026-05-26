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
  Tag,
  Globe,
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
    allowedRoles: ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH'],
  },
  {
    to: '/events',
    label: 'Events',
    Icon: CalendarDays,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH'],
  },
  {
    to: '/event-types',
    label: 'Event Types',
    Icon: BookOpen,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_ADMIN'],
  },
  {
    to: '/interaction-types',
    label: 'Interaction Types',
    Icon: Layers,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_ADMIN'],
  },
  {
    to: '/session-types',
    label: 'Session Types',
    Icon: Tag,
    allowedRoles: ['SUPER_ADMIN'],
  },
  {
    to: '/booking-pages',
    label: 'Booking Pages',
    Icon: Globe,
    allowedRoles: ['SUPER_ADMIN'],
  },
]
