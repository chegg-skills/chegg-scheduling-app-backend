import { useState, useEffect, useCallback, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'
import type { SafeUser } from '@/types'
import { usersApi } from '@/api/users'
import { authApi } from '@/api/auth'
import { clearCsrfToken } from '@/lib/axios'
import queryClient from '@/lib/queryClient'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await usersApi.getMe()
      setUser(data.data ?? null)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false))
  }, [refreshUser])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      // Never swallow this silently: the request is what revokes the refresh
      // token server-side. An unreported failure here leaves a resumable
      // session in place while the UI still proceeds to look logged out —
      // local state is cleared below regardless, since that is the safer
      // failure mode, but the failure itself must stay visible.
      Sentry.captureException(error)
    } finally {
      setUser(null)
      clearCsrfToken()
      queryClient.clear()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        setUser,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
