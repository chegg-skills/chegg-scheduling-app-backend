import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

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
    onBack: () => void
    onConfirm: () => void
    isSubmitting?: boolean
}

export function ConfirmationForm({
    studentInfo,
    onUpdate,
    onBack,
    onConfirm,
    isSubmitting = false
}: ConfirmationFormProps) {
    const handleChange = (field: keyof StudentInfo) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        onUpdate({ ...studentInfo, [field]: e.target.value })
    }

    return (
        <Box component={Paper} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Enter Your Details</Typography>
            <Stack spacing={3}>
                <TextField
                    label="Full Name"
                    fullWidth
                    required
                    value={studentInfo.name}
                    onChange={handleChange('name')}
                />
                <TextField
                    label="Email Address"
                    fullWidth
                    required
                    type="email"
                    value={studentInfo.email}
                    onChange={handleChange('email')}
                />
                <TextField
                    label="What is your specific question or problem?"
                    fullWidth
                    multiline
                    rows={2}
                    value={studentInfo.specificQuestion}
                    onChange={handleChange('specificQuestion')}
                    placeholder="e.g., I'm having trouble with the calculus chain rule..."
                />
                <TextField
                    label="What have you already tried?"
                    fullWidth
                    multiline
                    rows={2}
                    value={studentInfo.triedSolutions}
                    onChange={handleChange('triedSolutions')}
                    placeholder="e.g., I tried these three practice problems but got stuck on step 2..."
                />
                <TextField
                    label="What resources have you used so far?"
                    fullWidth
                    multiline
                    rows={2}
                    value={studentInfo.usedResources}
                    onChange={handleChange('usedResources')}
                    placeholder="e.g., Textbook chapter 4, Khan Academy video on..."
                />
                <TextField
                    label="What would you like to achieve in this session?"
                    fullWidth
                    multiline
                    rows={2}
                    value={studentInfo.sessionObjectives}
                    onChange={handleChange('sessionObjectives')}
                    placeholder="e.g., I want to be able to solve these types of problems independently..."
                />
                <TextField
                    label="Additional Notes (Optional)"
                    fullWidth
                    multiline
                    rows={2}
                    value={studentInfo.notes}
                    onChange={handleChange('notes')}
                />
                <Box sx={{ pt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Button onClick={onBack}>Back</Button>
                    <Button
                        variant="contained"
                        size="large"
                        disabled={!studentInfo.name || !studentInfo.email || isSubmitting}
                        onClick={onConfirm}
                    >
                        {isSubmitting ? 'Booking...' : 'Confirm Booking'}
                    </Button>
                </Box>
            </Stack>
        </Box>
    )
}
