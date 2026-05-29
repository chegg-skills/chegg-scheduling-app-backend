import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/api/public'

export const publicBookingDirectoryKeys = {
  all: ['public-booking-directory'] as const,
  bySlug: (slug: string) => [...publicBookingDirectoryKeys.all, slug] as const,
}

export function usePublicBookingDirectoryBySlug(slug: string) {
  return useQuery({
    queryKey: publicBookingDirectoryKeys.bySlug(slug),
    queryFn: ({ signal }) =>
      publicApi.getBookingDirectoryBySlug(slug, signal).then((r) => r.data.data?.bookingDirectory ?? null),
    enabled: !!slug,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
