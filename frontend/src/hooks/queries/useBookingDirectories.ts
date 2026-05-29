import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingDirectoriesApi } from '@/api/bookingDirectories'
import type {
  CreateBookingDirectoryDto,
  UpdateBookingDirectoryDto,
  AddBookingDirectorySectionDto,
  AddBookingDirectoryTeamDto,
} from '@/types'
import { invalidateQueryKeys } from '../queryUtils'

export const bookingDirectoryKeys = {
  all: ['booking-directories'] as const,
  list: () => [...bookingDirectoryKeys.all, 'list'] as const,
  detail: (id: string) => [...bookingDirectoryKeys.all, 'detail', id] as const,
}

export function useBookingDirectories() {
  return useQuery({
    queryKey: bookingDirectoryKeys.list(),
    queryFn: ({ signal }) =>
      bookingDirectoriesApi.list(signal).then((r) => r.data.data?.bookingDirectories ?? []),
  })
}

export function useBookingDirectory(id: string) {
  return useQuery({
    queryKey: bookingDirectoryKeys.detail(id),
    queryFn: ({ signal }) =>
      bookingDirectoriesApi.getById(id, signal).then((r) => r.data.data?.bookingDirectory ?? null),
    enabled: !!id,
  })
}

export function useCreateBookingDirectory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBookingDirectoryDto) => bookingDirectoriesApi.create(data),
    onSuccess: () => invalidateQueryKeys(qc, [bookingDirectoryKeys.all]),
  })
}

export function useUpdateBookingDirectory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ directoryId, data }: { directoryId: string; data: UpdateBookingDirectoryDto }) =>
      bookingDirectoriesApi.update(directoryId, data),
    onSuccess: () => invalidateQueryKeys(qc, [bookingDirectoryKeys.all]),
  })
}

export function useDeleteBookingDirectory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (directoryId: string) => bookingDirectoriesApi.delete(directoryId),
    onSuccess: () => invalidateQueryKeys(qc, [bookingDirectoryKeys.all]),
  })
}

export function useAddBookingDirectorySection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ directoryId, data }: { directoryId: string; data: AddBookingDirectorySectionDto }) =>
      bookingDirectoriesApi.addSection(directoryId, data),
    onSuccess: () => invalidateQueryKeys(qc, [bookingDirectoryKeys.all]),
  })
}

export function useRemoveBookingDirectorySection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ directoryId, sectionId }: { directoryId: string; sectionId: string }) =>
      bookingDirectoriesApi.removeSection(directoryId, sectionId),
    onSuccess: () => invalidateQueryKeys(qc, [bookingDirectoryKeys.all]),
  })
}

export function useAddTeamToSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      directoryId,
      sectionId,
      data,
    }: {
      directoryId: string
      sectionId: string
      data: AddBookingDirectoryTeamDto
    }) => bookingDirectoriesApi.addTeamToSection(directoryId, sectionId, data),
    onSuccess: () => invalidateQueryKeys(qc, [bookingDirectoryKeys.all]),
  })
}

export function useRemoveTeamFromSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      directoryId,
      sectionId,
      teamId,
    }: {
      directoryId: string
      sectionId: string
      teamId: string
    }) => bookingDirectoriesApi.removeTeamFromSection(directoryId, sectionId, teamId),
    onSuccess: () => invalidateQueryKeys(qc, [bookingDirectoryKeys.all]),
  })
}
