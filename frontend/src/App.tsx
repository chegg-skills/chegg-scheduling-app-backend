import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import queryClient from '@/lib/queryClient'
import { AuthProvider } from '@/context/auth'
import { ConfirmProvider } from '@/context/confirm'
import { router } from '@/router'
import { appTheme } from '@/theme'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

export default function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ConfirmProvider>
              <RouterProvider
                router={router}
                future={{
                  v7_startTransition: true,
                }}
              />
            </ConfirmProvider>
          </AuthProvider>
        </QueryClientProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}
