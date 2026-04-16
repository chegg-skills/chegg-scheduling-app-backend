import { useState, useEffect, useCallback, type ReactNode } from 'react'
import type { SafeUser } from '@/types'
import { usersApi } from '@/api/users'
import { authApi } from '@/api/auth'
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
    } finally {
      setUser(null)
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
