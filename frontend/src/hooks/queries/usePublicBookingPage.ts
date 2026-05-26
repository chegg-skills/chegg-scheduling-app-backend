import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/api/public'

export const publicBookingPageKeys = {
  all: ['public-booking-page'] as const,
  bySlug: (slug: string) => [...publicBookingPageKeys.all, slug] as const,
}

export function usePublicBookingPageBySlug(slug: string) {
  return useQuery({
    queryKey: publicBookingPageKeys.bySlug(slug),
    queryFn: ({ signal }) =>
      publicApi
        .getBookingPageBySlug(slug, signal)
        .then((r) => r.data.data?.bookingPage ?? null),
    enabled: !!slug,
    retry: false,
  })
}
