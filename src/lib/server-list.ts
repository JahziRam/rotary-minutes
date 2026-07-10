/** Server-side list helpers: URL params, skip/take, paginated results. */

export const DEFAULT_SERVER_PAGE_SIZE = 12;
export const MAX_SERVER_PAGE_SIZE = 100;

export type ListUrlParams = {
  q?: string;
  page?: string;
  pageSize?: string;
  status?: string;
};

export type ParsedListParams = {
  q: string;
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  status?: string;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  start: number;
  end: number;
};

export function parseListParams(
  sp: ListUrlParams,
  defaultPageSize: number = DEFAULT_SERVER_PAGE_SIZE
): ParsedListParams {
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_SERVER_PAGE_SIZE,
    Math.max(1, parseInt(sp.pageSize ?? String(defaultPageSize), 10) || defaultPageSize)
  );
  const q = sp.q?.trim() ?? "";
  const status = sp.status?.trim() || undefined;
  return {
    q,
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    status,
  };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);
  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    start,
    end,
  };
}

export function listParamsToRecord(
  params: ParsedListParams,
  extra?: Record<string, string | undefined>
): Record<string, string | undefined> {
  return {
    q: params.q || undefined,
    page: params.page > 1 ? String(params.page) : undefined,
    pageSize:
      params.pageSize !== DEFAULT_SERVER_PAGE_SIZE ? String(params.pageSize) : undefined,
    status: params.status,
    ...extra,
  };
}

export function buildListQueryString(
  params: Record<string, string | undefined>,
  overrides?: Record<string, string | undefined>
): string {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}