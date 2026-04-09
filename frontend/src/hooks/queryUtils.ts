import type { QueryClient, QueryKey } from '@tanstack/react-query'

export const preservePreviousData = <T>(previousData: T | undefined) => previousData

export async function invalidateQueryKeys(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
): Promise<void> {
  await Promise.all(
    queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  )
}
