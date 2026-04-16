import { createTheme, alpha } from '@mui/material/styles'

const cheggOrange = '#E87100'
const neutral900 = '#3A2C41'
const white = '#FFFFFF'
const peachAccent = '#FFF6F0'
const lavenderAccent = '#E2DFFF'

const success500 = '#1DA275'
const success100 = '#ECFEFA'
const error500 = '#E5222F'
const error100 = '#FFEAEB'
const warning500 = '#AC8B14'
const warning100 = '#FFFBE9'
const info500 = '#2E8AEE'
const info100 = '#ECF5FF'

const softBorder = '#DEE3ED'

declare module '@mui/material/styles' {
  interface Palette {
    accent: {
      peach: string
      lavender: string
    }
  }
  interface PaletteOptions {
    accent?: {
      peach?: string
      lavender?: string
    }
  }
}

export const appTheme = createTheme({
  palette: {
    primary: {
      main: cheggOrange,
      light: alpha(cheggOrange, 0.1),
      dark: alpha(cheggOrange, 0.8),
      contrastText: white,
    },
    secondary: {
      main: neutral900,
      light: alpha(neutral900, 0.1),
      dark: alpha(neutral900, 0.9),
    },
    info: {
      main: info500,
      light: info100,
    },
    error: {
      main: error500,
      light: error100,
    },
    warning: {
      main: warning500,
      light: warning100,
    },
    success: {
      main: success500,
      light: success100,
    },
    background: {
      default: white,
      paper: white,
    },
    text: {
      primary: neutral900,
      secondary: alpha(neutral900, 0.7),
    },
    divider: softBorder,
    // Brand Accents
    accent: {
      peach: peachAccent,
      lavender: lavenderAccent,
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily:
      '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { color: neutral900, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' },
    h2: { color: neutral900, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' },
    h3: { color: neutral900, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' },
    h4: {
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      color: neutral900,
    },
    h5: {
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '0',
      color: neutral900,
    },
    h6: {
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '0',
      color: neutral900,
    },
    subtitle1: {
      fontWeight: 600,
      lineHeight: 1.3,
    },
    subtitle2: {
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: neutral900,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: neutral900,
    },
    button: {
      textTransform: 'none',
      fontWeight: 700,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: white,
          backgroundAttachment: 'fixed',
          color: neutral900,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '8px 20px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          backgroundColor: cheggOrange,
          '&:hover': {
            backgroundColor: alpha(cheggOrange, 0.9),
            boxShadow: `0 4px 14px ${alpha(cheggOrange, 0.25)}`,
          },
        },
        containedSecondary: {
          backgroundColor: neutral900,
          '&:hover': {
            backgroundColor: alpha(neutral900, 0.9),
            boxShadow: `0 4px 14px ${alpha(neutral900, 0.25)}`,
          },
        },
        outlined: {
          borderWidth: '1.5px',
          borderColor: softBorder,
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: alpha(cheggOrange, 0.04),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 10px 40px rgba(0,0,0,0.03)',
          border: `1px solid ${softBorder}`,
        },
        outlined: {
          boxShadow: 'none',
          borderColor: softBorder,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 8px 24px -4px rgba(0,0,0,0.05)',
          border: `1px solid ${softBorder}`,
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
          borderRadius: 12,
          backgroundColor: '#ffffff',
          minHeight: 56,
          transition: 'all 0.2s',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(cheggOrange, 0.4),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '2px',
          },
        },
        input: {
          padding: '14.5px 14px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          padding: '8px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          '& .MuiTypography-root': {
            color: neutral900,
            lineHeight: 1.6,
          },
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 700,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.9rem',
          fontWeight: 500,
        },
        standardInfo: {
          backgroundColor: info100,
          color: '#263A63',
          border: `1px solid ${alpha(info500, 0.2)}`,
          '& .MuiAlert-icon': { color: info500 },
        },
        standardSuccess: {
          backgroundColor: success100,
          color: '#223D44',
          border: `1px solid ${alpha(success500, 0.2)}`,
          '& .MuiAlert-icon': { color: success500 },
        },
        standardWarning: {
          backgroundColor: warning100,
          color: '#473C2C',
          border: `1px solid ${alpha(warning500, 0.2)}`,
          '& .MuiAlert-icon': { color: warning500 },
        },
        standardError: {
          backgroundColor: error100,
          color: '#482034',
          border: `1px solid ${alpha(error500, 0.2)}`,
          '& .MuiAlert-icon': { color: error500 },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
          borderSpacing: 0,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(cheggOrange, 0.03),
          '& .MuiTableCell-root': {
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            color: '#525252',
            padding: '16px 20px',
            borderBottom: `2px solid ${softBorder}`,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '16px 20px',
          borderColor: softBorder,
          fontSize: '0.875rem',
          color: neutral900,
          '&:first-of-type': {
            paddingLeft: '24px',
          },
          '&:last-of-type': {
            paddingRight: '24px',
          },
        },
        body: {
          fontWeight: 400,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&.MuiTableRow-hover:hover': {
            backgroundColor: alpha(neutral900, 0.03),
          },
          '&:last-child .MuiTableCell-root': {
            borderBottom: 0,
          },
        },
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        root: {
          '& .MuiTableSortLabel-icon': {
            opacity: 0.4,
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          },
          '&.Mui-active .MuiTableSortLabel-icon': {
            opacity: 1,
            color: cheggOrange,
          },
          '&:hover .MuiTableSortLabel-icon': {
            opacity: 0.8,
          },
        },
      },
    },
  },
})
