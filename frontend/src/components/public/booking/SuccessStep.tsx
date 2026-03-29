import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { CheckCircle2 } from 'lucide-react'

interface SuccessStepProps {
    email: string
    onReset: () => void
}

export function SuccessStep({ email, onReset }: SuccessStepProps) {
    return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle2 size={64} color="green" style={{ marginBottom: 16 }} />
            <Typography variant="h4" fontWeight={700} gutterBottom>
                Booking Confirmed!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                We've sent a confirmation email to {email}.
            </Typography>
            <Button variant="outlined" onClick={onReset}>
                Book Another Session
            </Button>
        </Box>
    )
}
