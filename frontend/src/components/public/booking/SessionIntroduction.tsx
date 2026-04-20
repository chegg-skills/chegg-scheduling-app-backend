import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import { alpha, useTheme } from '@mui/material/styles'
import { Info } from 'lucide-react'

interface SessionIntroductionProps {
    description: string
}

export function SessionIntroduction({ description }: SessionIntroductionProps) {
    const theme = useTheme()

    return (
        <Box
            sx={{
                mt: 2,
                mb: 3,
                p: 2,
                borderRadius: 1,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                border: '1px solid',
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 200, // Fixed height as requested
                minHeight: 0,
                flexShrink: 0,
            }}
        >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, flexShrink: 0 }}>
                <Info size={16} color={theme.palette.primary.main} />
                <Typography
                    variant="subtitle2"
                    fontWeight={800}
                    color="primary.main"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}
                >
                    Session Introduction
                </Typography>
            </Stack>

            <Box
                sx={{
                    overflowY: 'auto',
                    pr: 1,
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                        borderRadius: 2,
                    },
                    '&::-webkit-scrollbar-track': {
                        bgcolor: 'transparent',
                    },
                }}
            >
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        lineHeight: 1.6,
                        fontWeight: 450,
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    {description}
                </Typography>
            </Box>
        </Box>
    )
}
