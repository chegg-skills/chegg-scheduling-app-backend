import React from 'react'
import { Box, Typography, Stack, TextField } from '@mui/material'
import type { Booking } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'
import type { FollowUpStudentInfo } from './useFollowUpStudentForm'

const MAX_CHARS = 500

interface FollowUpDetailsStepProps {
  booking: Booking
  studentInfo: FollowUpStudentInfo
  effectiveQuestions: string[]
  handleCustomAnswerChange: (
    index: number
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleFormChange: (
    field: keyof FollowUpStudentInfo
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

/** Step 2 — read-only student identity, effective questions, and notes field. */
export function FollowUpDetailsStep({
  booking,
  studentInfo,
  effectiveQuestions,
  handleCustomAnswerChange,
  handleFormChange,
}: FollowUpDetailsStepProps) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1 }}>
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          fontWeight={800}
          sx={{ display: 'block', mb: 1, letterSpacing: 1.2, fontSize: '0.7rem' }}
        >
          Registration
        </Typography>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5, letterSpacing: -0.5 }}>
          Your information
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          Please provide details to finalize the booking.
        </Typography>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          pt: 1,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.200', borderRadius: 2 },
        }}
      >
        <Stack spacing={2} sx={{ pb: 2, px: 0.5, maxWidth: 800 }}>
          {/* Student Info is read-only for follow-up sessions */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Full name"
              fullWidth
              disabled
              size="small"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': { minHeight: 'unset' },
                '& .MuiInputBase-input': { py: 1.25 },
              }}
              value={toTitleCase(booking.studentName)}
            />
            <TextField
              label="Email address"
              fullWidth
              disabled
              size="small"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': { minHeight: 'unset' },
                '& .MuiInputBase-input': { py: 1.25 },
              }}
              type="email"
              value={booking.studentEmail}
            />
          </Box>

          {effectiveQuestions.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
              {effectiveQuestions.map((question, index) => {
                const answerValue = studentInfo.customAnswers?.[index] || ''
                return (
                  <TextField
                    key={index}
                    label={question}
                    fullWidth
                    size="small"
                    multiline
                    rows={3}
                    variant="outlined"
                    sx={{ '& .MuiOutlinedInput-root': { minHeight: 'unset' } }}
                    value={answerValue}
                    onChange={handleCustomAnswerChange(index)}
                    placeholder="Enter your answer..."
                    inputProps={{ maxLength: MAX_CHARS }}
                    helperText={
                      answerValue.length >= MAX_CHARS
                        ? `Maximum character limit of ${MAX_CHARS} reached`
                        : `${answerValue.length} / ${MAX_CHARS}`
                    }
                    FormHelperTextProps={{
                      sx: {
                        textAlign: 'right',
                        color: answerValue.length >= MAX_CHARS ? 'error.main' : 'text.secondary',
                        fontWeight: answerValue.length >= MAX_CHARS ? 600 : 400,
                      },
                    }}
                    error={answerValue.length >= MAX_CHARS}
                  />
                )
              })}
            </Box>
          )}

          <TextField
            label="Internal Notes / Follow-up Details"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={studentInfo.notes}
            onChange={handleFormChange('notes')}
            placeholder="Additional notes for the coach..."
            inputProps={{ maxLength: MAX_CHARS }}
            helperText={
              studentInfo.notes.length >= MAX_CHARS
                ? `Maximum character limit of ${MAX_CHARS} reached`
                : `${studentInfo.notes.length} / ${MAX_CHARS}`
            }
            FormHelperTextProps={{
              sx: {
                textAlign: 'right',
                color: studentInfo.notes.length >= MAX_CHARS ? 'error.main' : 'text.secondary',
                fontWeight: studentInfo.notes.length >= MAX_CHARS ? 600 : 400,
              },
            }}
            error={studentInfo.notes.length >= MAX_CHARS}
          />
        </Stack>
      </Box>
    </Box>
  )
}
