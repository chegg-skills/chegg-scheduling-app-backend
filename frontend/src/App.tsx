import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import queryClient from '@/lib/queryClient'
import { AuthProvider } from '@/context/AuthContext'
import { ConfirmProvider } from '@/context/ConfirmContext'
import { router } from '@/router'
import { appTheme } from '@/theme'

export default function App() {
  return (
    <ThemeProvider theme={appTheme}>
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
    </ThemeProvider>
  )
}
