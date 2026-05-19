import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import { useTheme, alpha } from '@mui/material/styles'
import {
  Globe,
  Calendar,
  Video,
  User,
  Copy,
  Check,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { format } from 'date-fns'
import type { StudentSummary, Booking } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'

interface StudentProfileCardProps {
  student: StudentSummary
  bookings: Booking[]
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export function StudentProfileCard({ student, bookings }: StudentProfileCardProps) {
  const theme = useTheme()
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(student.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy email', err)
    }
  }

  // 1. Timezone (Extracted from latest booking, default to system)
  const latestBooking = bookings[0]
  const studentTimezone = latestBooking?.timezone || 'UTC'

  // 2. Preferred Learning Mode
  const locationTypes = bookings.map((b) => b.event?.locationType).filter(Boolean)
  const virtualCount = locationTypes.filter((t) => t === 'VIRTUAL').length
  const inPersonCount = locationTypes.filter((t) => t === 'IN_PERSON').length
  const preferredMode =
    virtualCount === 0 && inPersonCount === 0
      ? 'No bookings yet'
      : virtualCount >= inPersonCount
        ? 'Virtual (Video Call)'
        : 'In-Person Session'

  // 3. Favorite Coach
  const coachCounts = bookings.reduce((acc, b) => {
    if (b.coach) {
      const name = `${b.coach.firstName} ${b.coach.lastName}`
      acc[name] = (acc[name] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  let favoriteCoach = 'N/A'
  let maxCoachCount = 0
  Object.entries(coachCounts).forEach(([name, count]) => {
    if (count > maxCoachCount) {
      maxCoachCount = count
      favoriteCoach = name
    }
  })

  // Profile cards data
  const profileDetails = [
    {
      label: 'Timezone',
      value: studentTimezone,
      icon: <Globe size={18} />,
      color: theme.palette.primary.main,
      tooltip: 'Derived from the timezone selected during this student\'s latest booking.',
    },
    {
      label: 'Learning Mode',
      value: preferredMode,
      icon: <Video size={18} />,
      color: theme.palette.success.main,
      tooltip: 'The format (Virtual vs In-Person) this student books most frequently.',
    },
    {
      label: 'Favorite Coach',
      value: maxCoachCount > 0 ? `${favoriteCoach} (${maxCoachCount} sessions)` : 'N/A',
      icon: <User size={18} />,
      color: theme.palette.secondary.main,
      tooltip: 'The coach this student has booked the most sessions with.',
    },
    {
      label: 'Member Since',
      value: student.createdAt ? format(new Date(student.createdAt), 'MMMM d, yyyy') : 'N/A',
      icon: <Calendar size={18} />,
      color: theme.palette.info.main,
      tooltip: 'The registration date when this student made their very first booking.',
    },
  ]

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 1.5,
        overflow: 'hidden',
        backgroundColor: 'background.paper',
        borderColor: 'divider',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Grid container spacing={4} alignItems="center">
          {/* Left section: Avatar & Quick Info */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack direction="row" spacing={3} alignItems="center">
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  fontSize: '2rem',
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                {getInitials(student.fullName)}
              </Avatar>
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
                    {toTitleCase(student.fullName)}
                  </Typography>
                  <Tooltip title="Verified Student">
                    <Box sx={{ display: 'flex', color: 'success.main' }}>
                      <ShieldCheck size={20} />
                    </Box>
                  </Tooltip>
                </Stack>

                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {student.email}
                  </Typography>
                  <Tooltip title={copied ? 'Copied!' : 'Copy Email'}>
                    <IconButton size="small" onClick={handleCopyEmail} sx={{ ml: 0.5, color: 'text.secondary' }}>
                      {copied ? <Check size={14} color={theme.palette.success.main} /> : <Copy size={14} />}
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label="Active student"
                    size="small"
                    color="success"
                    sx={{
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      fontSize: '0.675rem',
                      letterSpacing: '0.05em',
                      px: 0.5,
                      borderRadius: '6px',
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.dark,
                    }}
                  />
                </Box>
              </Stack>
            </Stack>
          </Grid>

          {/* Right section: Detailed profile details */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Box
              sx={{
                pl: { md: 4 },
                borderLeft: { md: '1px solid' },
                borderColor: { md: 'divider' },
              }}
            >
              <Grid container spacing={3}>
                {profileDetails.map((detail) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={detail.label}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          p: 1.25,
                          borderRadius: '12px',
                          backgroundColor: alpha(detail.color, 0.08),
                          color: detail.color,
                          display: 'flex',
                        }}
                      >
                        {detail.icon}
                      </Box>
                      <Box>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          >
                            {detail.label}
                          </Typography>
                          <Tooltip title={detail.tooltip} arrow placement="top">
                            <Box
                              sx={{
                                display: 'inline-flex',
                                color: 'text.secondary',
                                opacity: 0.5,
                                '&:hover': {
                                  opacity: 1,
                                  color: 'primary.main',
                                },
                              }}
                            >
                              <Info size={12} />
                            </Box>
                          </Tooltip>
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {detail.value}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
