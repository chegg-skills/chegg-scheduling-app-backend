import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * NotFoundPage displays a clean, editorial 404 error message.
 * It matches the minimalist design requested by the user.
 */
export function NotFoundPage() {
    const navigate = useNavigate()

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                p: 3,
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                spacing={4}
                sx={{
                    mb: 6,
                    '& > *': {
                        userSelect: 'none',
                    },
                }}
            >
                <Typography
                    variant="h1"
                    sx={{
                        fontSize: { xs: '3rem', sm: '4rem' },
                        fontWeight: 500,
                        color: 'text.primary',
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        pr: 4,
                        lineHeight: 1,
                    }}
                >
                    404
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        fontSize: '1rem',
                        color: 'text.primary',
                        fontWeight: 400,
                        letterSpacing: '0.02em',
                    }}
                >
                    This page could not be found.
                </Typography>
            </Stack>

            <Button
                variant="outlined"
                startIcon={<ArrowLeft size={18} />}
                onClick={() => navigate('/dashboard')}
                sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        bgcolor: 'transparent',
                    },
                }}
            >
                Back to dashboard
            </Button>
        </Box>
    )
}
