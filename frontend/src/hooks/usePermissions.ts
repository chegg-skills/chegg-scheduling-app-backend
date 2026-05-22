import { useMemo } from 'react'
import { useAuth } from '@/context/auth'

export function usePermissions() {
  const { user } = useAuth()

  return useMemo(() => {
    const isCoach = user?.role === 'COACH'
    const isTeamAdmin = user?.role === 'TEAM_ADMIN'
    const isSuperAdmin = user?.role === 'SUPER_ADMIN'
    const isAdmin = isTeamAdmin || isSuperAdmin

    return {
      userId: user?.id,
      role: user?.role,
      isCoach,
      isTeamAdmin,
      isSuperAdmin,
      isAdmin,
      canManageEvents: isAdmin,
      canManageTeams: isSuperAdmin,
      canManageScheduleSlots: isAdmin,
      canViewCoachProfile: (coachId: string) => isAdmin || user?.id === coachId,
    }
  }, [user])
}
