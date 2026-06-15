import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
  systemSettingsKeys,
} from '@/hooks/queries/useSystemSettings'

const MAX_QUESTIONS = 5

interface DraftQuestion {
  id?: string
  text: string
  tempId?: string
}

export function DefaultBookingQuestionsSection() {
  const queryClient = useQueryClient()
  const { data: questions = [], isLoading } = useDefaultBookingQuestions()
  const createMutation = useCreateDefaultQuestion()
  const updateMutation = useUpdateDefaultQuestion()
  const deleteMutation = useDeleteDefaultQuestion()

  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sync draft list when database questions finish loading
  useEffect(() => {
    if (questions) {
      setDraftQuestions(
        questions.map((q) => ({
          id: q.id,
          text: q.text,
        }))
      )
    }
  }, [questions])

  const handleAddQuestion = () => {
    if (draftQuestions.length < MAX_QUESTIONS) {
      setDraftQuestions([
        ...draftQuestions,
        { text: '', tempId: Math.random().toString() },
      ])
      setSaveError(null)
    }
  }

  const handleRemoveQuestion = (index: number) => {
    setDraftQuestions(draftQuestions.filter((_, i) => i !== index))
    setSaveError(null)
  }

  const handleTextChange = (index: number, newText: string) => {
    const updated = [...draftQuestions]
    updated[index] = { ...updated[index], text: newText }
    setDraftQuestions(updated)
    setSaveError(null)
  }

  const handleDiscard = () => {
    setDraftQuestions(
      questions.map((q) => ({
        id: q.id,
        text: q.text,
      }))
    )
    setSaveError(null)
  }

  const handleSave = async () => {
    // Validate empty texts
    const hasEmpty = draftQuestions.some((q) => !q.text.trim())
    if (hasEmpty) {
      setSaveError('Question text cannot be empty. Please fill in or remove empty questions.')
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      // 1. Identify which questions to delete
      const toDelete = questions.filter((q) => !draftQuestions.some((dq) => dq.id === q.id))
      for (const q of toDelete) {
        await deleteMutation.mutateAsync(q.id)
      }

      // 2. Process updates and creations in order
      for (let i = 0; i < draftQuestions.length; i++) {
        const dq = draftQuestions[i]
        if (dq.id) {
          // Existing: update text and/or order (index i)
          const original = questions.find((q) => q.id === dq.id)
          if (original && (original.text !== dq.text || original.order !== i)) {
            await updateMutation.mutateAsync({
              id: dq.id,
              data: { text: dq.text, order: i },
            })
          }
        } else {
          // New: create
          // Backend assigns it max(order) + 1, which puts it at index i as we process sequentially
          await createMutation.mutateAsync(dq.text)
        }
      }

      // 3. Re-fetch and update UI
      await queryClient.invalidateQueries({ queryKey: systemSettingsKeys.bookingQuestions })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save questions. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const isDirty =
    draftQuestions.length !== questions.length ||
    draftQuestions.some((dq, idx) => {
      const q = questions[idx]
      return !q || q.id !== dq.id || q.text !== dq.text
    })

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
        These questions are shown to students on the public booking form for all events that use default questions. You can have up to {MAX_QUESTIONS}. Click Save Changes after editing.
      </Typography>

      <Divider sx={{ my: 2.5 }} />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Stack spacing={2.5}>
          {saveSuccess && (
            <Alert severity="success" variant="filled" sx={{ borderRadius: 1.5 }}>
              Default booking questions saved successfully.
            </Alert>
          )}

          {saveError && (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: 1.5 }}>
              {saveError}
            </Alert>
          )}

          {draftQuestions.length === 0 && (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
              No default questions configured. Click "Add Question" below to configure up to {MAX_QUESTIONS} default booking questions.
            </Alert>
          )}

          {draftQuestions.map((dq, index) => (
            <Stack key={dq.id || dq.tempId} direction="row" spacing={1.5} alignItems="flex-start">
              <TextField
                fullWidth
                size="small"
                label={`Question ${index + 1}`}
                placeholder="e.g. What is your main objective for this session?"
                value={dq.text}
                onChange={(e) => handleTextChange(index, e.target.value)}
                inputProps={{ maxLength: 255 }}
                helperText={`${dq.text.length}/255`}
                FormHelperTextProps={{ sx: { textAlign: 'right' } }}
              />
              <IconButton
                size="small"
                color="error"
                sx={{ mt: 0.5, flexShrink: 0 }}
                onClick={() => handleRemoveQuestion(index)}
              >
                <Trash2 size={18} />
              </IconButton>
            </Stack>
          ))}

          {draftQuestions.length < MAX_QUESTIONS && (
            <Box>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddQuestion}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                <Plus size={16} /> Add Question ({draftQuestions.length}/{MAX_QUESTIONS})
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDiscard}
              disabled={!isDirty || isSaving}
            >
              Discard Changes
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  )
}
