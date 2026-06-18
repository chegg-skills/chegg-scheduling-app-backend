import type { MouseEvent } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Link from '@mui/material/Link'
import { Link as RouterLink } from 'react-router-dom'
import { alpha } from '@mui/material/styles'
import {
  Clock,
  MoreVertical,
  Layers,
  MapPin,
  Laptop,
  Globe,
  CalendarRange,
  CalendarDays,
  User,
  Users,
  AlertTriangle,
} from 'lucide-react'
import type { Event, EventType } from '@/types'
import { PublicBookingLinkCell } from '@/components/shared/PublicBookingLinkCell'
import { EventBadge, BADGE_SX, BADGE_LABEL_SX } from './EventBadge'
import { toTitleCase } from '@/utils/toTitleCase'
import { getUserInitials } from '@/utils/userDisplay'

const LOCATION_COLORS = {
  VIRTUAL: '#2E8AEE',
  IN_PERSON: '#E5222F',
  CUSTOM: '#AC8B14',
} as const

const BOOKING_MODE_COLORS = {
  COACH_AVAILABILITY: '#E87100',
  FIXED_SLOTS: '#8b5cf6',
} as const

const INTERACTION_TYPE_CONFIG: Record<string, { label: string; isOneToOne: boolean }> = {
  ONE_TO_ONE: { label: '1:1', isOneToOne: true },
  ONE_TO_MANY: { label: '1:N', isOneToOne: false },
  MANY_TO_ONE: { label: 'N:1', isOneToOne: false },
  MANY_TO_MANY: { label: 'N:N', isOneToOne: false },
}

const AVATAR_GROUP_SX = {
  '& .MuiAvatar-root': {
    width: 26,
    height: 26,
    fontSize: '0.675rem',
    fontWeight: 700,
    border: '1.5px solid #fff',
  },
}

const SWITCH_SX = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: 'success.main' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'success.main' },
}

const ACTION_ICON_SX = {
  color: 'text.secondary',
  '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
  transition: 'all 0.2s',
}

function LocationBadge({ type, value }: { type: string; value?: string | null }) {
  switch (type) {
    case 'VIRTUAL':
      return (
        <EventBadge
          icon={Laptop}
          iconColor={LOCATION_COLORS.VIRTUAL}
          label="Virtual"
          tooltip={value || 'Virtual Meeting'}
        />
      )
    case 'IN_PERSON':
      return (
        <EventBadge
          icon={MapPin}
          iconColor={LOCATION_COLORS.IN_PERSON}
          label="In Person"
          tooltip={value || 'In Person'}
        />
      )
    default:
      return (
        <EventBadge
          icon={Globe}
          iconColor={LOCATION_COLORS.CUSTOM}
          label="Custom"
          tooltip={value || 'Custom Location'}
        />
      )
  }
}

function BookingModeBadge({ mode }: { mode: string }) {
  const isAvailability = mode === 'COACH_AVAILABILITY'
  return (
    <EventBadge
      icon={isAvailability ? CalendarRange : CalendarDays}
      iconColor={
        isAvailability ? BOOKING_MODE_COLORS.COACH_AVAILABILITY : BOOKING_MODE_COLORS.FIXED_SLOTS
      }
      label={isAvailability ? 'Coach Availability' : 'Fixed Slots'}
    />
  )
}

function InteractionTypeBadge({ type }: { type: string }) {
  const config = INTERACTION_TYPE_CONFIG[type] ?? INTERACTION_TYPE_CONFIG.ONE_TO_ONE
  return (
    <EventBadge
      icon={config.isOneToOne ? User : Users}
      iconColor={config.isOneToOne ? '#1DA275' : '#008080'}
      label={config.label}
    />
  )
}

interface EventCardProps {
  event: Event
  accentColor: string
  currentEventType?: EventType
  canManage: boolean
  canViewCoachProfile: (coachId: string) => boolean
  onViewUser?: (userId: string) => void
  onToggleActive: (event: Event) => void
  onMenuOpen: (e: MouseEvent<HTMLButtonElement>, event: Event) => void
  showTeamName?: boolean
}

export function EventCard({
  event,
  accentColor,
  currentEventType,
  canManage,
  canViewCoachProfile,
  onViewUser,
  onToggleActive,
  onMenuOpen,
  showTeamName = false,
}: EventCardProps) {
  const durationMinutes = Math.floor(event.durationSeconds / 60)

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 1.5,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '4px solid',
        borderLeftColor: accentColor,
        '&:hover': { borderColor: accentColor },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2.5}>
        {/* Left: name, badges, coaches */}
        <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
          <Link
            component={RouterLink}
            to={`/events/${event.id}`}
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              textDecoration: 'none',
              fontSize: '0.975rem',
              '&:hover': { color: 'primary.main', textDecoration: 'underline' },
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              alignSelf: 'flex-start',
              maxWidth: '100%',
            }}
          >
            {toTitleCase(event.name)}
          </Link>

          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 0.25 }}
          >
            {/* Event Type badge (uses raw BADGE_SX — no tooltip needed) */}
            <Box sx={BADGE_SX}>
              <Layers size={13} style={{ opacity: 0.8, color: '#E87100' }} />
              <Typography variant="caption" sx={BADGE_LABEL_SX}>
                {currentEventType?.name}
              </Typography>
            </Box>

            {showTeamName && event.team?.name && (
              <Box sx={BADGE_SX}>
                <Users size={13} style={{ opacity: 0.8, color: '#6b7280' }} />
                <Typography variant="caption" sx={BADGE_LABEL_SX}>
                  {toTitleCase(event.team.name)}
                </Typography>
              </Box>
            )}

            <EventBadge icon={Clock} iconColor="#007b83" label={`${durationMinutes} min`} />
            <LocationBadge type={event.locationType} value={event.locationValue} />
            <BookingModeBadge mode={event.bookingMode} />
            <InteractionTypeBadge type={event.interactionType} />
          </Stack>

          {/* Coaches */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
            {event.coaches.length === 0 ? (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.25,
                  py: 0.4,
                  borderRadius: 1.5,
                  bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                  color: 'warning.main',
                  border: '1px solid',
                  borderColor: (theme) => alpha(theme.palette.warning.main, 0.15),
                }}
              >
                <AlertTriangle size={12} />
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.725rem' }}>
                  Needs Coaches
                </Typography>
              </Box>
            ) : (
              <>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700, fontSize: '0.725rem', mr: 0.5 }}
                >
                  Assigned Hosts:
                </Typography>
                <AvatarGroup max={4} sx={AVATAR_GROUP_SX}>
                  {event.coaches.map((coach) => {
                    const initials = getUserInitials(
                      coach.coachUser.firstName,
                      coach.coachUser.lastName
                    ).toUpperCase()
                    const canView = onViewUser && canViewCoachProfile(coach.coachUser.id)
                    return (
                      <Tooltip
                        key={coach.id}
                        title={`${toTitleCase(coach.coachUser.firstName)} ${toTitleCase(coach.coachUser.lastName)} (${coach.coachUser.email})`}
                        arrow
                      >
                        <Avatar
                          onClick={
                            canView
                              ? (e) => {
                                  e.stopPropagation()
                                  onViewUser?.(coach.coachUser.id)
                                }
                              : undefined
                          }
                          sx={{
                            bgcolor: 'secondary.light',
                            color: 'secondary.dark',
                            cursor: canView ? 'pointer' : 'default',
                          }}
                        >
                          {initials}
                        </Avatar>
                      </Tooltip>
                    )
                  })}
                </AvatarGroup>
              </>
            )}
          </Stack>
        </Stack>

        {/* Right: status toggle, booking link, actions menu */}
        <Stack direction="row" spacing={2.5} alignItems="center" sx={{ flexShrink: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, fontSize: '0.75rem', display: { xs: 'none', sm: 'inline' } }}
            >
              {event.isActive ? 'Active' : 'Inactive'}
            </Typography>
            <Switch
              size="small"
              checked={event.isActive}
              disabled={!canManage}
              onChange={() => onToggleActive(event)}
              color="success"
              sx={SWITCH_SX}
            />
          </Stack>

          <PublicBookingLinkCell
            type="event"
            slug={event.publicBookingSlug}
            isActive={event.isActive}
          />

          {canManage && (
            <IconButton
              size="small"
              onClick={(e) => onMenuOpen(e, event)}
              sx={ACTION_ICON_SX}
            >
              <MoreVertical size={18} />
            </IconButton>
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}
