import type { Team } from '@/types'
import type { SortAccessorMap } from '@/hooks/useTableSort'

export type TeamSortKey = 'team' | 'description' | 'status'

export const teamSortAccessors: SortAccessorMap<Team, TeamSortKey> = {
  team: (team) => team.name,
  description: (team) => team.description ?? '',
  status: (team) => team.isActive,
}

export const teamTableColumns: Array<{ label: string; sortKey: TeamSortKey }> = [
  { label: 'Team', sortKey: 'team' },
  { label: 'Description', sortKey: 'description' },
  { label: 'Status', sortKey: 'status' },
]
