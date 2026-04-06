import { z } from 'zod'
import type { Team } from '@/types'

export const teamFormSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  teamLeadId: z.string().min(1, 'Team lead is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type TeamFormValues = z.infer<typeof teamFormSchema>

export function getTeamFormDefaults(team?: Team): TeamFormValues {
  return {
    name: team?.name ?? '',
    teamLeadId: team?.teamLeadId ?? '',
    description: team?.description ?? '',
    isActive: team?.isActive ?? true,
  }
}
