import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { HelpCircle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/shared/ui/Button'
import {
  useDefaultBookingQuestions,
  useCreateDefaultQuestion,
  useUpdateDefaultQuestion,
  useDeleteDefaultQuestion,
} from '@/hooks/queries/useSystemSettings'

const MAX_QUESTIONS = 5

export function DefaultBookingQuestionsSection() {
  const { data: questions = [], isLoading } = useDefaultBookingQuestions()
  const createMutation = useCreateDefaultQuestion()
  const updateMutation = useUpdateDefaultQuestion()
  const deleteMutation = useDeleteDefaultQuestion()

  // Local draft for the "add new question" input
  const [newText, setNewText] = useState('')
  const [newError, setNewError] = useState<string | null>(null)

  const handleAdd = () => {
    const trimmed = newText.trim()
    if (!trimmed) {
      setNewError('Question text cannot be empty.')
      return
    }
    setNewError(null)
    createMutation.mutate(trimmed, {
      onSuccess: () => setNewText(''),
    })
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleBlurUpdate = (id: string, value: string) => {
    const trimmed = value.trim()
    const original = questions.find((q) => q.id === id)?.text
    if (!trimmed || trimmed === original) return
    updateMutation.mutate({ id, data: { text: trimmed } })
  }

  return (
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
        <HelpCircle size={18} />
        <Typography variant="subtitle1" fontWeight={600}>
          Default Booking Questions
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        These questions are shown to students on the public booking form for all events that haven't
        defined custom questions. Changes go live immediately. Maximum {MAX_QUESTIONS} questions.
      </Typography>

      <Divider sx={{ my: 2.5 }} />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Stack spacing={2}>
          {questions.length === 0 && (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
              No default questions configured. Students will see no questions on events using
              default questions mode.
            </Alert>
          )}

          {questions.map((q) => (
            <Stack key={q.id} direction="row" spacing={1} alignItems="flex-start">
              <TextField
                fullWidth
                size="small"
                defaultValue={q.text}
                onBlur={(e) => handleBlurUpdate(q.id, e.target.value)}
                inputProps={{ maxLength: 255 }}
                helperText={`${q.text.length}/255`}
                FormHelperTextProps={{ sx: { textAlign: 'right' } }}
              />
              <IconButton
                size="small"
                color="error"
                sx={{ mt: 0.5, flexShrink: 0 }}
                onClick={() => handleDelete(q.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={18} />
              </IconButton>
            </Stack>
          ))}

          {questions.length < MAX_QUESTIONS && (
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                fullWidth
                size="small"
                placeholder="Type a new default question…"
                value={newText}
                onChange={(e) => {
                  setNewText(e.target.value)
                  if (newError) setNewError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAdd()
                  }
                }}
                error={!!newError}
                helperText={newError ?? `${newText.length}/255`}
                inputProps={{ maxLength: 255 }}
                FormHelperTextProps={{
                  sx: { textAlign: 'right', color: newError ? 'error.main' : 'text.secondary' },
                }}
              />
              <IconButton
                size="small"
                color="primary"
                sx={{ mt: 0.5, flexShrink: 0 }}
                onClick={handleAdd}
                disabled={createMutation.isPending || !newText.trim()}
              >
                <Plus size={18} />
              </IconButton>
            </Stack>
          )}

          {questions.length >= MAX_QUESTIONS && (
            <Typography variant="caption" color="text.secondary">
              Maximum of {MAX_QUESTIONS} default questions reached.
            </Typography>
          )}
        </Stack>
      )}

      {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {(createMutation.error as Error)?.message ||
            (updateMutation.error as Error)?.message ||
            (deleteMutation.error as Error)?.message ||
            'An error occurred. Please try again.'}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setNewText('')
            setNewError(null)
          }}
          disabled={!newText}
        >
          Clear
        </Button>
      </Box>
    </Box>
  )
}
