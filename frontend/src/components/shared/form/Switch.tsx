import MuiSwitch from '@mui/material/Switch'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { styled, alpha } from '@mui/material/styles'

const StyledSwitch = styled(MuiSwitch)(({ theme }) => ({
    width: 36,
    height: 20,
    padding: 0,
    display: 'flex',
    '&:active': {
        '& .MuiSwitch-thumb': {
            width: 18,
        },
        '& .MuiSwitch-switchBase.Mui-checked': {
            transform: 'translateX(10px)',
        },
    },
    '& .MuiSwitch-switchBase': {
        padding: 2,
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                opacity: 1,
                backgroundColor: theme.palette.primary.main,
            },
        },
    },
    '& .MuiSwitch-thumb': {
        boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%)',
        width: 16,
        height: 16,
        borderRadius: 10,
        transition: theme.transitions.create(['width'], {
            duration: 200,
        }),
    },
    '& .MuiSwitch-track': {
        borderRadius: 20 / 2,
        opacity: 1,
        backgroundColor: alpha(theme.palette.text.primary, 0.1),
        boxSizing: 'border-box',
    },
}))

interface SwitchProps {
    label?: string
    checked?: boolean
    onChange?: (checked: boolean) => void
    disabled?: boolean
}

export function Switch({ label, checked, onChange, disabled }: SwitchProps) {
    const control = (
        <StyledSwitch
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
        />
    )

    if (!label) return control

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {control}
            <Typography
                variant="body2"
                sx={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'text.secondary',
                    userSelect: 'none',
                }}
            >
                {label}
            </Typography>
        </Box>
    )
}
