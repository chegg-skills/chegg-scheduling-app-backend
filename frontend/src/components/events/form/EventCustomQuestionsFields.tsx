import { useFormContext } from 'react-hook-form'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import MuiSwitch from '@mui/material/Switch'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import { Plus, Trash2 } from 'lucide-react'
import { useDefaultBookingQuestions } from '@/hooks/queries/useSystemSettings'
import type { EventFormValues } from './eventFormSchema'

const MAX_QUESTIONS = 5

export function EventCustomQuestionsFields() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<EventFormValues>()

  const { data: systemDefaults = [], isLoading: defaultsLoading } = useDefaultBookingQuestions()

  const customQuestions = watch('customQuestions') || []
  const useDefaultQuestions = watch('useDefaultQuestions') ?? true

  const hasSystemDefaults = systemDefaults.length > 0

  const handleToggleCustom = (enabled: boolean) => {
    if (enabled) {
      setValue('useDefaultQuestions', false, { shouldDirty: true, shouldValidate: true })
      if (customQuestions.length === 0) {
        setValue('customQuestions', [''], { shouldDirty: true, shouldValidate: true })
      }
    } else {
      setValue('useDefaultQuestions', true, { shouldDirty: true, shouldValidate: true })
      // Keep customQuestions in form state so toggling back restores them.
      // The server clears them from DB when useDefaultQuestions=true is saved.
    }
  }

  const handleAddQuestion = () => {
    if (customQuestions.length < MAX_QUESTIONS) {
      setValue('customQuestions', [...customQuestions, ''], {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  const handleRemoveQuestion = (index: number) => {
    setValue(
      'customQuestions',
      customQuestions.filter((_, i) => i !== index),
      { shouldDirty: true, shouldValidate: true },
    )
  }

  const handleQuestionChange = (index: number, val: string) => {
    const updated = [...customQuestions]
    updated[index] = val
    setValue('customQuestions', updated, { shouldDirty: true, shouldValidate: true })
  }

  const customQuestionsError = errors.customQuestions as { message?: string } | undefined

  return (
    <Box>
      {/* Toggle — only shown when system defaults exist */}
      {(hasSystemDefaults || !defaultsLoading) && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {useDefaultQuestions
                ? 'Using system default questions'
                : 'Using custom questions for this event'}
            </Typography>
          </Stack>

          <Tooltip
            title={
              !hasSystemDefaults
                ? 'No system default questions configured. Enable custom questions to define your own.'
                : useDefaultQuestions
                  ? 'Switch to custom questions for this event'
                  : 'Switch back to system default questions'
            }
          >
            <span>
              <FormControlLabel
                control={
                  <MuiSwitch
                    checked={!useDefaultQuestions}
                    onChange={(e) => handleToggleCustom(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={500}>
                    Use custom questions
                  </Typography>
                }
                labelPlacement="start"
                sx={{ ml: 0, gap: 1 }}
              />
            </span>
          </Tooltip>
        </Box>
      )}

      {/* Default questions — read-only preview */}
      {useDefaultQuestions && (
        <Stack spacing={2} sx={{ maxWidth: 800 }}>
          {defaultsLoading ? (
            <>
              <Skeleton variant="rounded" height={56} />
              <Skeleton variant="rounded" height={56} />
              <Skeleton variant="rounded" height={56} />
            </>
          ) : hasSystemDefaults ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Students will be asked the following questions during booking:
              </Typography>
              {systemDefaults.map((q) => (
                <TextField
                  key={q.id}
                  label={q.text}
                  fullWidth
                  disabled
                  size="small"
                  variant="outlined"
                />
              ))}
            </>
          ) : (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
              No default questions have been configured in System Settings. Enable custom questions
              below to define questions specific to this event, or leave as-is to show no questions
              to students.
            </Alert>
          )}
        </Stack>
      )}

      {/* Custom questions editor */}
      {!useDefaultQuestions && (
        <Stack spacing={2.5}>
          {customQuestionsError?.message && (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: 1.5 }}>
              {customQuestionsError.message}
            </Alert>
          )}

          {customQuestions.length === 0 ? (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
              No custom questions added yet. Click "Add Question" below.
            </Alert>
          ) : (
            <Stack spacing={2} sx={{ maxWidth: 800 }}>
              {customQuestions.map((question, index) => {
                const fieldErrors = errors.customQuestions as any
                const questionError = fieldErrors?.[index]?.message

                return (
                  <Stack key={index} direction="row" spacing={1.5} alignItems="flex-start">
                    <TextField
                      fullWidth
                      size="small"
                      label={`Question ${index + 1}`}
                      placeholder="e.g. What topic would you like to cover?"
                      value={question}
                      onChange={(e) => handleQuestionChange(index, e.target.value)}
                      error={!!questionError}
                      helperText={questionError || `${question.length}/255`}
                      inputProps={{ maxLength: 255 }}
                      FormHelperTextProps={{
                        sx: {
                          textAlign: 'right',
                          color: questionError ? 'error.main' : 'text.secondary',
                        },
                      }}
                    />
                    <IconButton
                      onClick={() => handleRemoveQuestion(index)}
                      color="error"
                      sx={{ mt: 0.5 }}
                      size="small"
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </Stack>
                )
              })}
            </Stack>
          )}

          <Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={handleAddQuestion}
              disabled={customQuestions.length >= MAX_QUESTIONS}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
            >
              Add Question ({customQuestions.length}/{MAX_QUESTIONS})
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  )
}
