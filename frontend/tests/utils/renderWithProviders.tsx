import { CssBaseline, ThemeProvider } from '@mui/material'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom'
import { AuthProvider } from '@/context/auth'
import { ConfirmProvider } from '@/context/confirm'
import { appTheme } from '@/theme'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
  initialEntries?: MemoryRouterProps['initialEntries']
}

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const { initialEntries = ['/'], ...renderOptions } = options
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider theme={appTheme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ConfirmProvider>
                <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
              </ConfirmProvider>
            </AuthProvider>
          </QueryClientProvider>
        </LocalizationProvider>
      </ThemeProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}
