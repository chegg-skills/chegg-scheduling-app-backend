/** Caller-supplied pagination parameters (both optional; defaults applied by `resolvePagination`). */
export type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

/** Resolved pagination values ready to pass directly to a Prisma query. */
export type PaginationResult = {
  /** Current page number (1-based, minimum 1). */
  page: number;
  /** Number of records per page, clamped to `[1, maxPageSize]`. */
  pageSize: number;
  /** Prisma `skip` offset derived from `(page - 1) * pageSize`. */
  skip: number;
};

/**
 * Normalises raw pagination inputs into safe, bounded values for use in
 * Prisma queries. All inputs are clamped — invalid or out-of-range values
 * never propagate to the database layer.
 *
 * @param options - Raw page/pageSize from the request (e.g. query params).
 * @param defaults - Override default and maximum page sizes per-endpoint.
 * @returns Resolved `{ page, pageSize, skip }` ready for Prisma `take`/`skip`.
 */
export const resolvePagination = (
  options: PaginationOptions = {},
  defaults: { defaultPageSize?: number; maxPageSize?: number } = {},
): PaginationResult => {
  const defaultPageSize = defaults.defaultPageSize ?? 50;
  const maxPageSize = defaults.maxPageSize ?? 100;

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, options.pageSize ?? defaultPageSize));

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
};
