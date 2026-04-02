import { createTheme, alpha } from '@mui/material/styles'

const cheggOrange = '#EB7100'
const indigoPurple = '#522D9B'
const tealCyan = '#397F89'
const deepBlack = '#000000'
const errorRed = '#CF2E2E'
const softBorder = '#DEE3ED'

export const appTheme = createTheme({
  palette: {
    primary: {
      main: cheggOrange,
      light: alpha(cheggOrange, 0.1),
      dark: '#c76000',
      contrastText: '#ffffff',
    },
    secondary: {
      main: indigoPurple,
      light: alpha(indigoPurple, 0.1),
      dark: '#3e2275',
    },
    info: {
      main: tealCyan,
      light: alpha(tealCyan, 0.1),
    },
    error: {
      main: errorRed,
      light: '#fff1f1',
    },
    warning: {
      main: '#f1c21b',
      light: '#fcf4d6',
    },
    success: {
      main: '#6D8B77', // Muted Sage from palette
      light: '#f0f4f1',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1a', // Darker gray for better contrast on white
      secondary: '#525252',
    },
    divider: softBorder,
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { color: deepBlack, fontWeight: 800 },
    h2: { color: deepBlack, fontWeight: 800 },
    h3: { color: deepBlack, fontWeight: 700 },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: deepBlack,
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: deepBlack,
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '0',
      color: deepBlack,
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
      lineHeight: 1.6,
      color: '#1a1a1a',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: '#1a1a1a',
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
          backgroundColor: '#ffffff',
          backgroundAttachment: 'fixed',
          color: '#1a1a1a',
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
            backgroundColor: '#d86800',
            boxShadow: `0 4px 14px ${alpha(cheggOrange, 0.25)}`,
          },
        },
        containedSecondary: {
          backgroundColor: indigoPurple,
          '&:hover': {
            backgroundColor: '#43257e',
            boxShadow: `0 4px 14px ${alpha(indigoPurple, 0.25)}`,
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
          transition: 'all 0.2s',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(cheggOrange, 0.4),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '2px',
          },
        },
        input: {
          padding: '10px 16px',
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
            color: '#1a1a1a',
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
          backgroundColor: alpha(tealCyan, 0.08),
          color: '#24535a',
          border: `1px solid ${alpha(tealCyan, 0.15)}`,
          '& .MuiAlert-icon': { color: tealCyan },
        },
        standardSuccess: {
          backgroundColor: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bcf0da',
        },
        standardWarning: {
          backgroundColor: '#fffbeb',
          color: '#92400e',
          border: '1px solid #fde68a',
        },
        standardError: {
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          border: '1px solid #fecaca',
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
          color: '#1a1a1a',
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
            backgroundColor: alpha(indigoPurple, 0.03),
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