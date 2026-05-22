import type { Team, SafeUser } from '@/types'
import type { SortAccessorMap } from '@/hooks/useTableSort'

export type TeamSortKey = 'team' | 'teamLead' | 'description' | 'status' | 'bookingLink'

export const getTeamSortAccessors = (users: SafeUser[]): SortAccessorMap<Team, TeamSortKey> => ({
  team: (team) => team.name,
  teamLead: (team) => {
    const leadUser = users.find((u) => u.id === team.teamLeadId)
    return leadUser ? `${leadUser.firstName} ${leadUser.lastName}` : ''
  },
  description: (team) => team.description ?? '',
  status: (team) => team.isActive,
  bookingLink: () => '',
})

export const teamTableColumns: Array<{ label: string; sortKey: TeamSortKey; width?: string | number }> = [
  { label: 'Team', sortKey: 'team', width: '30%' },
  { label: 'Description', sortKey: 'description', width: '25%' },
  { label: 'Team Lead', sortKey: 'teamLead', width: '20%' },
  { label: 'Status', sortKey: 'status', width: '10%' },
  { label: 'Booking link', sortKey: 'bookingLink', width: '15%' },
]
