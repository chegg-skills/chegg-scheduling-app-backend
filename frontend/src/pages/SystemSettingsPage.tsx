import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import { MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/queries/useSystemSettings'

export function SystemSettingsPage() {
  const { data: settings, isLoading, error } = useSystemSettings()
  const mutation = useUpdateSystemSettings()

  const [feedbackFormLink, setFeedbackFormLink] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setFeedbackFormLink(settings.feedbackFormLink ?? '')
    }
  }, [settings])

  const handleSave = () => {
    setValidationError(null)

    if (feedbackFormLink && !/^https?:\/\/.+/.test(feedbackFormLink)) {
      setValidationError('Please enter a valid URL starting with http:// or https://')
      return
    }

    mutation.mutate(
      { feedbackFormLink: feedbackFormLink.trim() },
      {
        onSuccess: () => {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
        },
      }
    )
  }

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load system settings." />

  return (
    <Box>
      <PageHeader
        title="System Settings"
        subtitle="Global configuration for the application. Changes apply across all teams."
      />

      <Box sx={{ px: { xs: 2.5, md: 4 }, pb: 4, maxWidth: 720 }}>
        {showSuccess && (
          <Alert severity="success" variant="filled" sx={{ mb: 3 }}>
            System settings saved successfully.
          </Alert>
        )}

        {/* Feedback Settings */}
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 3,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <MessageSquare size={18} />
            <Typography variant="subtitle1" fontWeight={600}>Post-Session Feedback</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure the global feedback form link sent to students after a completed session.
            Teams can opt in to send this link via their notification settings.
          </Typography>

          <Divider sx={{ my: 2.5 }} />

          <Stack spacing={2}>
            <TextField
              label="Feedback Form Link"
              placeholder="https://forms.example.com/feedback"
              fullWidth
              value={feedbackFormLink}
              onChange={(e) => {
                setFeedbackFormLink(e.target.value)
                setValidationError(null)
              }}
              error={!!validationError}
              helperText={
                validationError ||
                'Leave blank to disable feedback emails even when teams have opted in.'
              }
              size="small"
            />
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button onClick={handleSave} isLoading={mutation.isPending}>
            Save Settings
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
