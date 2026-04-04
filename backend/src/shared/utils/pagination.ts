export type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

export type PaginationResult = {
  page: number;
  pageSize: number;
  skip: number;
};

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
