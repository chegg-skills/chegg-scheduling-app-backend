import type { TeamMember, UserRole } from '@/types'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import { Info } from 'lucide-react'
import { useRemoveTeamMember, useTeamMemberWorkload } from '@/hooks/queries/useTeamMembers'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { TeamMemberRow } from './TeamMemberRow'

interface TeamMemberListProps {
  teamId: string
  members: TeamMember[]
  currentUserRole: UserRole
  teamLeadId: string
  onViewUser?: (userId: string) => void
}

export function TeamMemberList({
  teamId,
  members,
  currentUserRole,
  teamLeadId,
  onViewUser,
}: TeamMemberListProps) {
  const { mutate: remove } = useRemoveTeamMember(teamId)
  const { handleAction } = useAsyncAction()
  const { data: workloadData } = useTeamMemberWorkload(teamId)
  const workloadMap = new Map(
    workloadData?.workload?.map((w) => [w.userId, w.sessionCount]) ?? []
  )

  if (members.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No members yet.
      </Typography>
    )
  }

  const sortedMembers = [...members].sort((a, b) => {
    if (a.userId === teamLeadId) return -1
    if (b.userId === teamLeadId) return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const handleRemove = (userId: string, name: string) => {
    handleAction(remove, userId, {
      title: 'Remove member',
      message: `Are you sure you want to remove ${name} from this team?`,
      actionName: 'Removal',
    })
  }

  const canManage = currentUserRole !== 'COACH'

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            {['Member', 'Role', 'Workload', ...(canManage ? ['Actions'] : [])].map((col) => {
              const isWorkload = col === 'Workload'
              return (
                <TableCell
                  key={col}
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    letterSpacing: '0.05em',
                  }}
                  align={col === 'Actions' ? 'right' : 'left'}
                >
                  {isWorkload ? (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <span>{col}</span>
                      <Tooltip title="Upcoming sessions across all events in this team" arrow>
                        <span style={{ display: 'inline-flex', cursor: 'pointer', color: '#9CA3AF' }}>
                          <Info size={14} />
                        </span>
                      </Tooltip>
                    </Stack>
                  ) : (
                    col
                  )}
                </TableCell>
              )
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedMembers.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              currentUserRole={currentUserRole}
              teamLeadId={teamLeadId}
              onRemove={handleRemove}
              onViewUser={onViewUser}
              sessionCount={workloadMap.get(member.userId)}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
