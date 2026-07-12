export interface PaginationInput {
  page?: unknown;
  limit?: unknown;
}

export const getPagination = (query: PaginationInput) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const paginated = <T>(items: T[], total: number, page: number, limit: number) => ({
  items,
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit)
});
