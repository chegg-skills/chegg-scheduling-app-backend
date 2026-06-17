import { alpha } from '@mui/material/styles'

/** Toolbar icon-button styling for the email composer; highlights the active format. */
export const getButtonStyles = (active: boolean) => ({
  width: 32,
  height: 32,
  borderRadius: 1.25, // 10px
  p: 0,
  color: active ? 'primary.main' : 'text.secondary',
  bgcolor: active ? (theme: any) => alpha(theme.palette.primary.main, 0.08) : 'transparent',
  border: '1px solid',
  borderColor: active ? (theme: any) => alpha(theme.palette.primary.main, 0.15) : 'transparent',
  transition: 'all 0.2s',
  '&:hover': {
    bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08),
    color: 'primary.main',
    borderColor: (theme: any) => alpha(theme.palette.primary.main, 0.15),
    transform: 'translateY(-0.5px)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
})
