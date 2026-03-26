import { createTheme, alpha } from '@mui/material/styles'

const primaryMain = '#0f62fe'
const secondaryMain = '#14532d'

export const appTheme = createTheme({
  palette: {
    primary: {
      main: primaryMain,
      light: alpha(primaryMain, 0.1),
      dark: '#0043ce',
      contrastText: '#ffffff',
    },
    secondary: {
      main: secondaryMain,
      light: alpha(secondaryMain, 0.1),
      dark: '#0e3e21',
    },
    error: {
      main: '#da1e28',
      light: '#fff1f1',
    },
    warning: {
      main: '#f1c21b',
      light: '#fcf4d6',
    },
    success: {
      main: '#24a148',
      light: '#defbe6',
    },
    background: {
      default: '#f4f7fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#161616',
      secondary: '#525252',
    },
    divider: '#e0e0e0',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#161616',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: '#161616',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '0',
    },
    subtitle1: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    subtitle2: {
      fontWeight: 600,
      fontSize: '0.875rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f4f7fb',
          backgroundImage: `
            radial-gradient(circle at 2% 10%, ${alpha(primaryMain, 0.05)} 0%, transparent 20%),
            radial-gradient(circle at 98% 90%, ${alpha(secondaryMain, 0.04)} 0%, transparent 25%)
          `,
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 20px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: `0 4px 12px ${alpha(primaryMain, 0.15)}`,
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${primaryMain} 0%, #0043ce 100%)`,
          boxShadow: `0 4px 14px ${alpha(primaryMain, 0.25)}`,
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 10px 40px rgba(0,0,0,0.03)',
          border: '1px solid #f0f0f0',
        },
        outlined: {
          boxShadow: 'none',
          borderColor: '#e0e0e0',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 12px 32px -8px rgba(0,0,0,0.08)',
          border: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'medium',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#ffffff',
          transition: 'all 0.2s',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(primaryMain, 0.4),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '2px',
          },
        },
        input: {
          padding: '12px 16px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          padding: '8px',
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 600,
        },
      },
    },
  },
})