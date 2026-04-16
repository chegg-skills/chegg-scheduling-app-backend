import * as React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { toTitleCase } from '@/utils/toTitleCase'

interface StudentInfo {
  name: string
  email: string
  notes: string
  specificQuestion: string
  triedSolutions: string
  usedResources: string
  sessionObjectives: string
}

interface ConfirmationFormProps {
  studentInfo: StudentInfo
  onUpdate: (info: StudentInfo) => void
}

export function ConfirmationForm({ studentInfo, onUpdate }: ConfirmationFormProps) {
  const handleChange =
    (field: keyof StudentInfo) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onUpdate({ ...studentInfo, [field]: e.target.value })
    }

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
          Please provide your details to finalize the booking.
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
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Full name"
              fullWidth
              required
              size="small"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': { minHeight: 'unset' },
                '& .MuiInputBase-input': { py: 1.25 },
              }}
              value={toTitleCase(studentInfo.name)}
              onChange={handleChange('name')}
            />
            <TextField
              label="Email address"
              fullWidth
              required
              size="small"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': { minHeight: 'unset' },
                '& .MuiInputBase-input': { py: 1.25 },
              }}
              type="email"
              value={studentInfo.email}
              onChange={handleChange('email')}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
            <TextField
              label="Specific question or problem?"
              fullWidth
              size="small"
              multiline
              rows={3}
              variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { minHeight: 'unset' } }}
              value={studentInfo.specificQuestion}
              onChange={handleChange('specificQuestion')}
              placeholder="e.g., I'm having trouble with the calculus chain rule..."
            />
            <TextField
              label="What have you already tried?"
              fullWidth
              size="small"
              multiline
              rows={3}
              variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { minHeight: 'unset' } }}
              value={studentInfo.triedSolutions}
              onChange={handleChange('triedSolutions')}
              placeholder="e.g., I tried these practice problems but got stuck..."
            />
            <TextField
              label="Resources used so far?"
              fullWidth
              size="small"
              multiline
              rows={3}
              variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { minHeight: 'unset' } }}
              value={studentInfo.usedResources}
              onChange={handleChange('usedResources')}
              placeholder="e.g., Textbook chapter 4..."
            />
            <TextField
              label="Session objectives"
              fullWidth
              size="small"
              multiline
              rows={3}
              variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { minHeight: 'unset' } }}
              value={studentInfo.sessionObjectives}
              onChange={handleChange('sessionObjectives')}
              placeholder="e.g., I want to be able to solve these types of problems..."
            />
          </Box>

          <TextField
            label="Additional notes (optional)"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={studentInfo.notes}
            onChange={handleChange('notes')}
          />
        </Stack>
      </Box>
    </Box>
  )
}
