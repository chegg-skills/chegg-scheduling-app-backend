import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { availabilityApi, type GetExceptionsParams } from '@/api/availability'
import type { SetWeeklyAvailabilityDto, CreateAvailabilityExceptionDto } from '@/types'
import { invalidateQueryKeys } from '../queryUtils'

export const availabilityKeys = {
  all: ['availability'] as const,
  weekly: (userId: string) => [...availabilityKeys.all, 'weekly', userId] as const,
  exceptionsRoot: (userId: string) => [...availabilityKeys.all, 'exceptions', userId] as const,
  exceptions: (userId: string, params?: GetExceptionsParams) =>
    [...availabilityKeys.exceptionsRoot(userId), params] as const,
  effectiveRoot: (userId: string) => [...availabilityKeys.all, 'effective', userId] as const,
  effective: (userId: string, params?: { from: string; to: string }) =>
    [...availabilityKeys.effectiveRoot(userId), params] as const,
}

export function useWeeklyAvailability(userId: string) {
  return useQuery({
    queryKey: availabilityKeys.weekly(userId),
    queryFn: ({ signal }) => availabilityApi.getWeekly(userId, signal).then((r) => r.data.data),
    enabled: !!userId,
  })
}

export function useUpdateWeeklyAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: SetWeeklyAvailabilityDto }) =>
      availabilityApi.setWeekly(userId, data),
    onSuccess: (_, { userId }) =>
      invalidateQueryKeys(qc, [
        availabilityKeys.weekly(userId),
        availabilityKeys.effectiveRoot(userId),
      ]),
  })
}

export function useAvailabilityExceptions(userId: string, params?: GetExceptionsParams) {
  return useQuery({
    queryKey: availabilityKeys.exceptions(userId, params),
    queryFn: ({ signal }) =>
      availabilityApi.getExceptions(userId, params, signal).then((r) => r.data.data),
    enabled: !!userId,
  })
}

export function useAddAvailabilityException() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: CreateAvailabilityExceptionDto }) =>
      availabilityApi.addException(userId, data),
    onSuccess: (_, { userId }) =>
      invalidateQueryKeys(qc, [
        availabilityKeys.exceptionsRoot(userId),
        availabilityKeys.effectiveRoot(userId),
      ]),
  })
}

export function useRemoveAvailabilityException() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, exceptionId }: { userId: string; exceptionId: string }) =>
      availabilityApi.removeException(userId, exceptionId),
    onSuccess: (_, { userId }) =>
      invalidateQueryKeys(qc, [
        availabilityKeys.exceptionsRoot(userId),
        availabilityKeys.effectiveRoot(userId),
      ]),
  })
}

export function useEffectiveAvailability(userId: string, params: { from: string; to: string }) {
  return useQuery({
    queryKey: availabilityKeys.effective(userId, params),
    queryFn: ({ signal }) =>
      availabilityApi.getEffective(userId, params, signal).then((r) => r.data.data),
    enabled: !!userId && !!params.from && !!params.to,
  })
}
