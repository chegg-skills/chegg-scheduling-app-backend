import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingPagesApi } from '@/api/bookingPages'
import type {
  CreateBookingPageDto,
  UpdateBookingPageDto,
  AddBookingPageSectionDto,
  AddBookingPageTeamDto,
} from '@/types'
import { invalidateQueryKeys } from '../queryUtils'

export const bookingPageKeys = {
  all: ['booking-pages'] as const,
  list: () => [...bookingPageKeys.all, 'list'] as const,
  detail: (id: string) => [...bookingPageKeys.all, 'detail', id] as const,
}

export function useBookingPages() {
  return useQuery({
    queryKey: bookingPageKeys.list(),
    queryFn: ({ signal }) =>
      bookingPagesApi.list(signal).then((r) => r.data.data?.bookingPages ?? []),
  })
}

export function useBookingPage(id: string) {
  return useQuery({
    queryKey: bookingPageKeys.detail(id),
    queryFn: ({ signal }) =>
      bookingPagesApi.getById(id, signal).then((r) => r.data.data?.bookingPage ?? null),
    enabled: !!id,
  })
}

export function useCreateBookingPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBookingPageDto) => bookingPagesApi.create(data),
    onSuccess: () => invalidateQueryKeys(qc, [bookingPageKeys.all]),
  })
}

export function useUpdateBookingPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pageId, data }: { pageId: string; data: UpdateBookingPageDto }) =>
      bookingPagesApi.update(pageId, data),
    onSuccess: () => invalidateQueryKeys(qc, [bookingPageKeys.all]),
  })
}

export function useDeleteBookingPage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pageId: string) => bookingPagesApi.delete(pageId),
    onSuccess: () => invalidateQueryKeys(qc, [bookingPageKeys.all]),
  })
}

export function useAddBookingPageSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pageId, data }: { pageId: string; data: AddBookingPageSectionDto }) =>
      bookingPagesApi.addSection(pageId, data),
    onSuccess: () => invalidateQueryKeys(qc, [bookingPageKeys.all]),
  })
}

export function useRemoveBookingPageSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pageId, sectionId }: { pageId: string; sectionId: string }) =>
      bookingPagesApi.removeSection(pageId, sectionId),
    onSuccess: () => invalidateQueryKeys(qc, [bookingPageKeys.all]),
  })
}

export function useAddTeamToSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      pageId,
      sectionId,
      data,
    }: {
      pageId: string
      sectionId: string
      data: AddBookingPageTeamDto
    }) => bookingPagesApi.addTeamToSection(pageId, sectionId, data),
    onSuccess: () => invalidateQueryKeys(qc, [bookingPageKeys.all]),
  })
}

export function useRemoveTeamFromSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      pageId,
      sectionId,
      teamId,
    }: {
      pageId: string
      sectionId: string
      teamId: string
    }) => bookingPagesApi.removeTeamFromSection(pageId, sectionId, teamId),
    onSuccess: () => invalidateQueryKeys(qc, [bookingPageKeys.all]),
  })
}
