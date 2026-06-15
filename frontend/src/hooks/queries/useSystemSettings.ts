import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { systemSettingsApi, bookingQuestionsApi } from '@/api/systemSettings'
import type { SystemSettings } from '@/types'

export const systemSettingsKeys = {
  all: ['system-settings'] as const,
  bookingQuestions: ['system-settings', 'booking-questions'] as const,
}

export function useSystemSettings() {
  return useQuery({
    queryKey: systemSettingsKeys.all,
    queryFn: ({ signal }) =>
      systemSettingsApi.get(signal).then((r) => r.data.data?.settings ?? { feedbackFormLink: '' }),
  })
}

export function useUpdateSystemSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SystemSettings>) => systemSettingsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: systemSettingsKeys.all })
    },
  })
}

export function useDefaultBookingQuestions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: systemSettingsKeys.bookingQuestions,
    queryFn: ({ signal }) =>
      bookingQuestionsApi.list(signal).then((r) => r.data.data?.questions ?? []),
    enabled: options?.enabled ?? true,
  })
}

export function useCreateDefaultQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => bookingQuestionsApi.create(text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: systemSettingsKeys.bookingQuestions })
    },
  })
}

export function useUpdateDefaultQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { text?: string; order?: number } }) =>
      bookingQuestionsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: systemSettingsKeys.bookingQuestions })
    },
  })
}

export function useDeleteDefaultQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => bookingQuestionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: systemSettingsKeys.bookingQuestions })
    },
  })
}
