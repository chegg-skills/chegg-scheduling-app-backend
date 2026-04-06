import { Avatar, Box, Stack, Typography, alpha, useTheme } from '@mui/material'

interface BookingStudentCellProps {
    name: string
    email: string
}

export function BookingStudentCell({ name, email }: BookingStudentCellProps) {
    const theme = useTheme()

    return (
        <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
                sx={{
                    width: 34,
                    height: 34,
                    fontSize: '0.8125rem',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    fontWeight: 700,
                }}
            >
                {name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
            </Avatar>
            <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {email}
                </Typography>
            </Box>
        </Stack>
    )
}
