import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { availabilityApi, type GetExceptionsParams } from '@/api/availability'
import type { SetWeeklyAvailabilityDto, CreateAvailabilityExceptionDto } from '@/types'

export const availabilityKeys = {
    all: ['availability'] as const,
    weekly: (userId: string) => [...availabilityKeys.all, 'weekly', userId] as const,
    exceptions: (userId: string, params?: GetExceptionsParams) => [...availabilityKeys.all, 'exceptions', userId, params] as const,
    effective: (userId: string, params?: { from: string; to: string }) => [...availabilityKeys.all, 'effective', userId, params] as const,
}

export function useWeeklyAvailability(userId: string) {
    return useQuery({
        queryKey: availabilityKeys.weekly(userId),
        queryFn: () => availabilityApi.getWeekly(userId).then((r) => r.data.data),
        enabled: !!userId,
    })
}

export function useUpdateWeeklyAvailability() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ userId, data }: { userId: string; data: SetWeeklyAvailabilityDto }) =>
            availabilityApi.setWeekly(userId, data),
        onSuccess: (_, { userId }) => {
            qc.invalidateQueries({ queryKey: availabilityKeys.weekly(userId) })
            qc.invalidateQueries({ queryKey: [...availabilityKeys.all, 'effective', userId] })
        },
    })
}

export function useAvailabilityExceptions(userId: string, params?: GetExceptionsParams) {
    return useQuery({
        queryKey: availabilityKeys.exceptions(userId, params),
        queryFn: () => availabilityApi.getExceptions(userId, params).then((r) => r.data.data),
        enabled: !!userId,
    })
}

export function useAddAvailabilityException() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ userId, data }: { userId: string; data: CreateAvailabilityExceptionDto }) =>
            availabilityApi.addException(userId, data),
        onSuccess: (_, { userId }) => {
            qc.invalidateQueries({ queryKey: [...availabilityKeys.all, 'exceptions', userId] })
            qc.invalidateQueries({ queryKey: [...availabilityKeys.all, 'effective', userId] })
        },
    })
}

export function useRemoveAvailabilityException() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ userId, exceptionId }: { userId: string; exceptionId: string }) =>
            availabilityApi.removeException(userId, exceptionId),
        onSuccess: (_, { userId }) => {
            qc.invalidateQueries({ queryKey: [...availabilityKeys.all, 'exceptions', userId] })
            qc.invalidateQueries({ queryKey: [...availabilityKeys.all, 'effective', userId] })
        },
    })
}

export function useEffectiveAvailability(userId: string, params: { from: string; to: string }) {
    return useQuery({
        queryKey: availabilityKeys.effective(userId, params),
        queryFn: () => availabilityApi.getEffective(userId, params).then((r) => r.data.data),
        enabled: !!userId && !!params.from && !!params.to,
    })
}
