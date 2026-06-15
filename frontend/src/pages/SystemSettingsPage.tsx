import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { Textarea } from '@/components/shared/form/Textarea'
import Divider from '@mui/material/Divider'
import { MessageSquare, HelpCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/queries/useSystemSettings'
import { DefaultBookingQuestionsSection } from '@/components/systemSettings/DefaultBookingQuestionsSection'

export function SystemSettingsPage() {
  const { data: settings, isLoading, error } = useSystemSettings()
  const mutation = useUpdateSystemSettings()

  const [activeTab, setActiveTab] = useState(0) // 0: Feedback Link, 1: Default Questions
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

  const tabs = [
    { id: 0, label: 'Feedback Link', icon: <MessageSquare size={16} /> },
    { id: 1, label: 'Default Questions', icon: <HelpCircle size={16} /> },
  ]

  return (
    <Box>
      <PageHeader
        title="System Settings"
        subtitle="Global configuration for the application. Changes apply across all teams."
      />

      <Box
        sx={{
          px: { xs: 2.5, md: 4 },
          pb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 4,
          alignItems: 'flex-start',
          maxWidth: 1080,
        }}
      >
        {/* Left Column: Sidebar Navigation Tabs */}
        <Box
          sx={{
            width: { xs: '100%', md: 220 },
            flexShrink: 0,
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            p: 1.5,
          }}
        >
          <Stack spacing={0.5}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <Box
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  sx={{
                    py: 1,
                    px: 2,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    bgcolor: isActive ? 'primary.lighter' : 'transparent',
                    color: isActive ? 'primary.main' : 'text.secondary',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: isActive ? 'primary.lighter' : 'action.hover',
                      color: isActive ? 'primary.main' : 'text.primary',
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: isActive ? 'primary.main' : 'text.secondary',
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {tab.icon}
                  </Box>
                  {tab.label}
                </Box>
              )
            })}
          </Stack>
        </Box>

        {/* Right Column: Active Configuration Content */}
        <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>
          {activeTab === 0 ? (
            <Box>
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
                  <Typography variant="subtitle1" fontWeight={600}>
                    Post-Session Feedback
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Configure the global feedback form link sent to students after a completed session.
                  Teams can opt in to send this link via their notification settings.
                </Typography>

                <Divider sx={{ my: 2.5 }} />

                <Stack spacing={2}>
                  <Textarea
                    label="Feedback Form Link"
                    placeholder="https://forms.example.com/feedback"
                    value={feedbackFormLink}
                    onChange={(e) => {
                      setFeedbackFormLink(e.target.value)
                      setValidationError(null)
                    }}
                    hasError={!!validationError}
                    helperText={
                      validationError ||
                      'Leave blank to disable feedback emails even when teams have opted in.'
                    }
                  />
                </Stack>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button onClick={handleSave} isLoading={mutation.isPending}>
                  Save Settings
                </Button>
              </Box>
            </Box>
          ) : (
            <DefaultBookingQuestionsSection />
          )}
        </Box>
      </Box>
    </Box>
  )
}
