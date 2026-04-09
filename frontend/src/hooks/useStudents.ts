import { useQuery } from '@tanstack/react-query'
import { studentsApi, type ListStudentsFilters } from '@/api/students'

export const studentKeys = {
    all: ['students'] as const,
    lists: () => [...studentKeys.all, 'list'] as const,
    list: (filters: ListStudentsFilters) => [...studentKeys.lists(), filters] as const,
    details: () => [...studentKeys.all, 'detail'] as const,
    detail: (id: string) => [...studentKeys.details(), id] as const,
    bookings: (id: string, filters: any) => [...studentKeys.detail(id), 'bookings', filters] as const,
}

export function useStudents(filters: ListStudentsFilters = {}) {
    return useQuery({
        queryKey: studentKeys.list(filters),
        queryFn: ({ signal }) => studentsApi.list(filters, signal).then(r => r.data.data),
        placeholderData: (prev) => prev,
    })
}

export function useStudent(id: string) {
    return useQuery({
        queryKey: studentKeys.detail(id),
        queryFn: ({ signal }) => studentsApi.getById(id, signal).then(r => r.data.data),
        enabled: !!id,
    })
}

export function useStudentBookings(id: string, filters: { page?: number; pageSize?: number } = {}) {
    return useQuery({
        queryKey: studentKeys.bookings(id, filters),
        queryFn: ({ signal }) => studentsApi.listBookings(id, filters, signal).then(r => r.data.data),
        enabled: !!id,
    })
}
