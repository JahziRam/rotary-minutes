/** Client-side list helpers: search normalize + pagination. */

export const DEFAULT_PAGE_SIZE = 12;

export function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchesSearch(haystack: string, query: string): boolean {
  if (!query.trim()) return true;
  return normalizeSearch(haystack).includes(normalizeSearch(query));
}

export function matchesAny(fields: Array<string | null | undefined>, query: string): boolean {
  if (!query.trim()) return true;
  const q = normalizeSearch(query);
  return fields.some((f) => f && normalizeSearch(f).includes(q));
}

export type PageSlice<T> = {
  page: number;
  totalPages: number;
  total: number;
  items: T[];
  start: number;
  end: number;
};

export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE
): PageSlice<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const slice = items.slice(startIdx, startIdx + pageSize);
  return {
    page: safePage,
    totalPages,
    total,
    items: slice,
    start: total === 0 ? 0 : startIdx + 1,
    end: Math.min(startIdx + pageSize, total),
  };
}
