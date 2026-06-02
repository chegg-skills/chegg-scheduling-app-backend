import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi, type ListStudentsFilters } from '@/api/students'

export const studentKeys = {
  all: ['students'] as const,
  lists: () => [...studentKeys.all, 'list'] as const,
  list: (filters: ListStudentsFilters) => [...studentKeys.lists(), filters] as const,
  details: () => [...studentKeys.all, 'detail'] as const,
  detail: (id: string) => [...studentKeys.details(), id] as const,
  bookings: (id: string, filters: any) => [...studentKeys.detail(id), 'bookings', filters] as const,
  sessionLogs: (id: string) => [...studentKeys.detail(id), 'session-logs'] as const,
  communications: (id: string) => [...studentKeys.detail(id), 'communications'] as const,
}

export function useStudents(filters: ListStudentsFilters = {}) {
  return useQuery({
    queryKey: studentKeys.list(filters),
    queryFn: ({ signal }) => studentsApi.list(filters, signal).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  })
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: ({ signal }) => studentsApi.getById(id, signal).then((r) => r.data.data!.student),
    enabled: !!id,
  })
}

export function useStudentBookings(id: string, filters: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: studentKeys.bookings(id, filters),
    queryFn: ({ signal }) => studentsApi.listBookings(id, filters, signal).then((r) => r.data.data),
    enabled: !!id,
  })
}

export function useStudentSessionLogs(id: string) {
  return useQuery({
    queryKey: studentKeys.sessionLogs(id),
    queryFn: ({ signal }) =>
      studentsApi.listSessionLogs(id, signal).then((r) => r.data.data?.sessionLogs ?? []),
    enabled: !!id,
  })
}

export function useStudentCommunications(
  id: string,
  options?: { refetchInterval?: number | false | ((query: any) => number | false) }
) {
  return useQuery({
    queryKey: studentKeys.communications(id),
    queryFn: ({ signal }) =>
      studentsApi.listCommunications(id, signal).then((r) => r.data.data?.logs ?? []),
    enabled: !!id,
    ...options,
  })
}

export function useSendStudentEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      studentId,
      subject,
      body,
    }: {
      studentId: string
      subject: string
      body: string
    }) => studentsApi.sendEmail(studentId, { subject, body }).then((r) => r.data.data?.log),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.communications(variables.studentId) })
    },
  })
}

export function useRetryStudentEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (logId: string) => studentsApi.retryEmail(logId).then((r) => r.data.data?.log),
    onSuccess: (newLog) => {
      if (newLog) {
        queryClient.invalidateQueries({ queryKey: studentKeys.communications(newLog.studentId) })
      }
    },
  })
}
