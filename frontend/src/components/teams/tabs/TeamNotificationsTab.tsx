import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import { Bell, Clock, ShieldCheck, UserCog, GraduationCap } from 'lucide-react'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import { Button } from '@/components/shared/ui/Button'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { useTeamNotificationConfig, useUpsertTeamNotificationConfig } from '@/hooks/queries/useTeams'

interface TeamNotificationsTabProps {
  teamId: string
  canEdit: boolean
}

export function TeamNotificationsTab({ teamId, canEdit }: TeamNotificationsTabProps) {
  const { data: config, isLoading, error } = useTeamNotificationConfig(teamId)
  const mutation = useUpsertTeamNotificationConfig(teamId)

  const [reminderOffsets, setReminderOffsets] = useState<number[]>([])

  const [adminNotifyOnBooking, setAdminNotifyOnBooking] = useState(true)
  const [adminNotifyOnCancellation, setAdminNotifyOnCancellation] = useState(true)
  const [adminNotifyOnNoShow, setAdminNotifyOnNoShow] = useState(true)

  const [coachNotifyOnBooking, setCoachNotifyOnBooking] = useState(true)
  const [coachNotifyOnCancellation, setCoachNotifyOnCancellation] = useState(true)
  const [coachNotifyOnNoShow, setCoachNotifyOnNoShow] = useState(true)

  const [notifyLeadOnAvailability, setNotifyLeadOnAvailability] = useState(true)

  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (config) {
      setReminderOffsets(config.reminderOffsets)
      setAdminNotifyOnBooking(config.adminNotifyOnBooking)
      setAdminNotifyOnCancellation(config.adminNotifyOnCancellation)
      setAdminNotifyOnNoShow(config.adminNotifyOnNoShow)
      setCoachNotifyOnBooking(config.coachNotifyOnBooking)
      setCoachNotifyOnCancellation(config.coachNotifyOnCancellation)
      setCoachNotifyOnNoShow(config.coachNotifyOnNoShow)
      setNotifyLeadOnAvailability(config.notifyLeadOnAvailability)
    }
  }, [config])

  if (isLoading) return <PageSpinner />
  if (error) {
    const message = (error as any)?.response?.data?.message || "Failed to load notification settings."
    return <ErrorAlert message={message} />
  }

  const handleToggleReminder = (offset: number) => {
    setReminderOffsets((prev) =>
      prev.includes(offset) ? prev.filter((o) => o !== offset) : [...prev, offset]
    )
  }

  const handleSave = () => {
    mutation.mutate(
      {
        reminderOffsets,
        adminNotifyOnBooking,
        adminNotifyOnCancellation,
        adminNotifyOnNoShow,
        coachNotifyOnBooking,
        coachNotifyOnCancellation,
        coachNotifyOnNoShow,
        notifyLeadOnAvailability,
      },
      {
        onSuccess: () => {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
        },
      }
    )
  }

  return (
    <Stack spacing={4}>
      <SectionHeader
        title="Notification Settings"
        description="Configure granular email alerts for team admins, coaches, and students."
      />

      {showSuccess && (
        <Alert severity="success" variant="filled">
          Notification settings saved successfully.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 6,
        }}
      >
        {/* Session Reminders Section */}
        <Stack spacing={3}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Clock size={22} className="text-primary-600" />
              <Typography variant="h6" fontWeight={600}>
                Student Reminders
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Students receive these automated email reminders before their session starts.
            </Typography>
          </Box>

          <Stack spacing={1}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={reminderOffsets?.includes(1440) || false}
                  onChange={() => handleToggleReminder(1440)}
                  disabled={!canEdit || mutation.isPending}
                />
              }
              label="24 hours before session"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={reminderOffsets?.includes(720) || false}
                  onChange={() => handleToggleReminder(720)}
                  disabled={!canEdit || mutation.isPending}
                />
              }
              label="12 hours before session"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={reminderOffsets?.includes(360) || false}
                  onChange={() => handleToggleReminder(360)}
                  disabled={!canEdit || mutation.isPending}
                />
              }
              label="6 hours before session"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={reminderOffsets?.includes(60) || false}
                  onChange={() => handleToggleReminder(60)}
                  disabled={!canEdit || mutation.isPending}
                />
              }
              label="1 hour before session"
            />
          </Stack>

          <Divider />

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Bell size={22} className="text-primary-600" />
              <Typography variant="h6" fontWeight={600}>
                Availability Alerts
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Notifications sent to team leads regarding coach schedule changes.
            </Typography>
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={notifyLeadOnAvailability}
                onChange={(e) => setNotifyLeadOnAvailability(e.target.checked)}
                disabled={!canEdit || mutation.isPending}
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  Notify team leads on availability exceptions
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Alert the lead when a coach adds a custom unavailable slot or date.
                </Typography>
              </Box>
            }
          />
        </Stack>

        {/* Admin & Coach Granular Alerts Section */}
        <Stack spacing={4}>
          {/* Admin Notifications */}
          <Stack spacing={2}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <UserCog size={22} className="text-primary-600" />
                <Typography variant="h6" fontWeight={600}>
                  Team Admin Alerts
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Choose which booking events should trigger emails to team admins.
              </Typography>
            </Box>

            <Box sx={{ pl: 1 }}>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={adminNotifyOnBooking}
                      onChange={(e) => setAdminNotifyOnBooking(e.target.checked)}
                      disabled={!canEdit || mutation.isPending}
                    />
                  }
                  label="New bookings"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={adminNotifyOnCancellation}
                      onChange={(e) => setAdminNotifyOnCancellation(e.target.checked)}
                      disabled={!canEdit || mutation.isPending}
                    />
                  }
                  label="Booking cancellations"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={adminNotifyOnNoShow}
                      onChange={(e) => setAdminNotifyOnNoShow(e.target.checked)}
                      disabled={!canEdit || mutation.isPending}
                    />
                  }
                  label="Student no-shows"
                />
              </Stack>
            </Box>
          </Stack>

          <Divider />

          {/* Coach Notifications */}
          <Stack spacing={2}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <GraduationCap size={22} className="text-primary-600" />
                <Typography variant="h6" fontWeight={600}>
                  Coach Alerts
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Choose which booking events should trigger emails to the assigned coach.
              </Typography>
            </Box>

            <Box sx={{ pl: 1 }}>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={coachNotifyOnBooking}
                      onChange={(e) => setCoachNotifyOnBooking(e.target.checked)}
                      disabled={!canEdit || mutation.isPending}
                    />
                  }
                  label="New assignments & reschedules"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={coachNotifyOnCancellation}
                      onChange={(e) => setCoachNotifyOnCancellation(e.target.checked)}
                      disabled={!canEdit || mutation.isPending}
                    />
                  }
                  label="Cancellations"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={coachNotifyOnNoShow}
                      onChange={(e) => setCoachNotifyOnNoShow(e.target.checked)}
                      disabled={!canEdit || mutation.isPending}
                    />
                  }
                  label="Student no-shows"
                />
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </Box>

      {canEdit && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={handleSave}
            isLoading={mutation.isPending}
            startIcon={<ShieldCheck size={18} />}
            size="lg"
          >
            Save Configuration
          </Button>
        </Box>
      )}
    </Stack>
  )
}
