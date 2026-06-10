import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { Trash2, Info } from 'lucide-react'
import type { EventCoach, UserWeeklyAvailability } from '@/types'
import { RowActions } from '@/components/shared/table/RowActions'
import { TablePagination } from '@/components/shared/table/TablePagination'
import { useAuth } from '@/context/auth'
import { useTimezones } from '@/hooks/queries/useConfig'
import { formatTimezoneLabel } from '@/components/users/userSystemFieldUtils'
import { EventCoachAvailabilityDialog } from './dialogs/EventCoachAvailabilityDialog'

const SHORT_WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatCoachAvailability(weeklyAvailability: UserWeeklyAvailability[] | undefined): string[] {
  if (!weeklyAvailability || weeklyAvailability.length === 0) {
    return ['No availability defined']
  }

  const sorted = [...weeklyAvailability].sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  const dayMap = new Map<number, typeof weeklyAvailability>()
  for (const item of sorted) {
    const list = dayMap.get(item.dayOfWeek) ?? []
    list.push(item)
    dayMap.set(item.dayOfWeek, list)
  }

  const groups: Array<{ days: number[]; slotsStr: string }> = []

  for (let day = 0; day < 7; day++) {
    const slots = dayMap.get(day)
    if (!slots || slots.length === 0) continue

    const slotsStr = slots
      .map((s) => `${s.startTime}–${s.endTime}`)
      .join(', ')

    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.slotsStr === slotsStr) {
      lastGroup.days.push(day)
    } else {
      groups.push({ days: [day], slotsStr })
    }
  }

  return groups.map((g) => {
    let daysStr = ''
    if (g.days.length === 1) {
      daysStr = SHORT_WEEKDAY_NAMES[g.days[0]]
    } else if (g.days.length === 2) {
      daysStr = `${SHORT_WEEKDAY_NAMES[g.days[0]]}, ${SHORT_WEEKDAY_NAMES[g.days[1]]}`
    } else {
      let isConsecutive = true
      for (let i = 1; i < g.days.length; i++) {
        if (g.days[i] !== g.days[i - 1] + 1) {
          isConsecutive = false
          break
        }
      }
      if (isConsecutive) {
        daysStr = `${SHORT_WEEKDAY_NAMES[g.days[0]]}–${SHORT_WEEKDAY_NAMES[g.days[g.days.length - 1]]}`
      } else {
        daysStr = g.days.map((d) => SHORT_WEEKDAY_NAMES[d]).join(', ')
      }
    }
    return `${daysStr}: ${g.slotsStr}`
  })
}

interface EventCoachTableProps {
  eventId: string
  coaches: EventCoach[]
  onRemove: (coachUserId: string, name: string) => void
  onViewUser?: (userId: string) => void
  canManage?: boolean
}

export function EventCoachTable({
  eventId,
  coaches,
  onRemove,
  onViewUser,
  canManage = true,
}: EventCoachTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [availabilityDialogCoach, setAvailabilityDialogCoach] = useState<EventCoach | null>(null)
  const { user: currentUser } = useAuth()
  const { data: timezones = [] } = useTimezones()
  const isCoach = currentUser?.role === 'COACH'

  const paginatedCoaches = coaches.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            {['Coach', 'Time Zone', 'Availability', 'Language', ...(canManage ? ['Actions'] : [])].map(
              (col) => {
                const isAvailability = col === 'Availability'
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
                    {isAvailability ? (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <span>{col}</span>
                        <Tooltip
                          title={
                            <Box sx={{ p: 0.5 }}>
                              <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>
                                Availability Types
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                                • <strong>Global availability:</strong> Default profile hours configured by the coach.
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                • <strong>Custom availability:</strong> Event-specific override hours that replace global profile availability.
                              </Typography>
                            </Box>
                          }
                          arrow
                        >
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
              }
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedCoaches.length > 0 ? (
            paginatedCoaches.map((coach) => {
              const isSelf = coach.coachUser.id === currentUser?.id
              const canView = onViewUser && (!isCoach || isSelf)
              return (
                <TableRow key={coach.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          fontSize: '0.875rem',
                          bgcolor: 'primary.light',
                          color: 'primary.dark',
                          fontWeight: 600,
                        }}
                      >
                        {coach.coachUser.firstName[0]}
                        {coach.coachUser.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography
                          variant="body2"
                          onClick={() => canView && onViewUser?.(coach.coachUser.id)}
                          sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            textDecoration: 'none',
                            cursor: canView ? 'pointer' : 'default',
                            '&:hover': {
                              color: canView ? 'primary.main' : 'inherit',
                              textDecoration: canView ? 'underline' : 'none',
                            },
                          }}
                        >
                          {coach.coachUser.firstName} {coach.coachUser.lastName}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {coach.coachUser.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', color: 'text.primary' }}>
                    {formatTimezoneLabel(coach.coachUser.timezone, timezones) || '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography
                          variant="caption"
                          onClick={canManage ? () => setAvailabilityDialogCoach(coach) : undefined}
                          sx={{
                            fontWeight: 600,
                            color: (coach.weeklyAvailabilityOverride ?? []).length > 0 ? 'primary.main' : 'text.secondary',
                            fontSize: '0.75rem',
                            textDecoration: canManage ? 'underline' : 'none',
                            cursor: canManage ? 'pointer' : 'default',
                            '&:hover': {
                              color: canManage
                                ? ((coach.weeklyAvailabilityOverride ?? []).length > 0 ? 'primary.dark' : 'text.primary')
                                : 'inherit',
                            },
                          }}
                        >
                          {(coach.weeklyAvailabilityOverride ?? []).length > 0 ? 'Custom availability' : 'Set Custom Availability'}
                        </Typography>
                      </Stack>
                      {formatCoachAvailability(
                        (coach.weeklyAvailabilityOverride ?? []).length > 0
                          ? (coach.weeklyAvailabilityOverride as unknown as UserWeeklyAvailability[])
                          : coach.coachUser.weeklyAvailability
                      ).map((line, idx) => (
                        <Typography
                          key={idx}
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: line === 'No availability defined' ? 400 : 500,
                          }}
                        >
                          {line}
                        </Typography>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>
                    {coach.coachUser.preferredLanguage ?? '—'}
                  </TableCell>
                  {canManage && (
                    <TableCell align="right">
                      <RowActions
                        actions={[
                          {
                            label: 'Remove',
                            icon: <Trash2 size={16} />,
                            color: 'error.main',
                            onClick: () =>
                              onRemove(
                                coach.coachUserId,
                                `${coach.coachUser.firstName} ${coach.coachUser.lastName}`
                              ),
                          },
                        ]}
                      />
                    </TableCell>
                  )}
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={canManage ? 5 : 4}
                align="center"
                sx={{ py: 3, color: 'text.secondary' }}
              >
                No coaches assigned yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        pagination={{
          page,
          pageSize,
          total: coaches.length,
          totalPages: Math.ceil(coaches.length / pageSize),
        }}
        onPageChange={setPage}
        onRowsPerPageChange={(newSize) => {
          setPageSize(newSize)
          setPage(1)
        }}
      />
    </TableContainer>

    <EventCoachAvailabilityDialog
      isOpen={availabilityDialogCoach !== null}
      onClose={() => setAvailabilityDialogCoach(null)}
      eventId={eventId}
      coach={availabilityDialogCoach}
    />
    </>
  )
}
