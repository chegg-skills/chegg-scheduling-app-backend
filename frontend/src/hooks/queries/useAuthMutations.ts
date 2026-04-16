import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuth } from '@/context/auth'
import type { LoginDto, RegisterDto, BootstrapDto, AcceptInviteDto } from '@/types'

export function useLogin() {
  const { setUser } = useAuth()
  return useMutation({
    mutationFn: (data: LoginDto) => authApi.login(data),
    onSuccess: ({ data }) => {
      if (data.data?.user) setUser(data.data.user)
    },
  })
}

export function useRegister() {
  const { setUser } = useAuth()
  return useMutation({
    mutationFn: (data: RegisterDto) => authApi.register(data),
    onSuccess: ({ data }) => {
      if (data.data?.user) setUser(data.data.user)
    },
  })
}

export function useLogout() {
  const { logout } = useAuth()
  return useMutation({ mutationFn: logout })
}

export function useBootstrap() {
  const { setUser } = useAuth()
  return useMutation({
    mutationFn: (data: BootstrapDto) => authApi.bootstrap(data),
    onSuccess: ({ data }) => {
      if (data.data?.user) setUser(data.data.user)
    },
  })
}

export function useAcceptInvite() {
  const { setUser } = useAuth()
  return useMutation({
    mutationFn: (data: AcceptInviteDto) => authApi.acceptInvite(data),
    onSuccess: ({ data }) => {
      if (data.data?.user) setUser(data.data.user)
    },
  })
}
