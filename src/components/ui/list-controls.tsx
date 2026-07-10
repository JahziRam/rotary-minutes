"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  DEFAULT_PAGE_SIZE,
  paginateArray,
  type PageSlice,
} from "@/lib/client-list";
import { buildListQueryString } from "@/lib/server-list";
import { cn } from "@/lib/utils";

export function ListSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const t = useTranslations("common");
  return (
    <div className={cn("relative flex-1 min-w-[12rem] max-w-md", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("search")}
        className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-200 bg-white text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
      />
    </div>
  );
}

export function ListPagination({
  page,
  totalPages,
  total,
  start,
  end,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const t = useTranslations("common");
  if (total === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2",
        className
      )}
    >
      <p className="text-xs text-gray-500">
        {t("listRange", { start, end, total })}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("previous")}
          </button>
          <span className="text-xs text-gray-600 tabular-nums">
            {t("pageOf", { page, totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
          >
            {t("next")}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Search + pagination state for in-memory lists. Resets page when query changes. */
export function useClientList<T>(
  items: T[],
  filterFn: (item: T, query: string) => boolean,
  pageSize: number = DEFAULT_PAGE_SIZE
): {
  query: string;
  setQuery: (q: string) => void;
  page: number;
  setPage: (p: number) => void;
  filtered: T[];
  pageSlice: PageSlice<T>;
  pageSize: number;
} {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => items.filter((item) => filterFn(item, query)),
    [items, query, filterFn]
  );

  const pageSlice = useMemo(
    () => paginateArray(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [query, items.length]);

  useEffect(() => {
    if (page > pageSlice.totalPages) setPage(pageSlice.totalPages);
  }, [page, pageSlice.totalPages]);

  return {
    query,
    setQuery,
    page: pageSlice.page,
    setPage,
    filtered,
    pageSlice,
    pageSize,
  };
}

export function ListToolbar({
  query,
  onQueryChange,
  children,
  className,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center gap-3", className)}>
      <ListSearch value={query} onChange={onQueryChange} />
      {children}
    </div>
  );
}

/** URL-driven pagination for server-side lists. */
export function ServerListPagination({
  basePath,
  page,
  totalPages,
  total,
  start,
  end,
  searchParams,
  className,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
  searchParams: Record<string, string | undefined>;
  className?: string;
}) {
  const t = useTranslations("common");
  if (total === 0) return null;

  const prevHref =
    page > 1
      ? `${basePath}${buildListQueryString(searchParams, { page: String(page - 1) })}`
      : undefined;
  const nextHref =
    page < totalPages
      ? `${basePath}${buildListQueryString(searchParams, { page: String(page + 1) })}`
      : undefined;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2",
        className
      )}
    >
      <p className="text-xs text-gray-500">
        {t("listRange", { start, end, total })}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {prevHref ? (
            <Link
              href={prevHref}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("previous")}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-400 opacity-40 pointer-events-none">
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("previous")}
            </span>
          )}
          <span className="text-xs text-gray-600 tabular-nums">
            {t("pageOf", { page, totalPages })}
          </span>
          {nextHref ? (
            <Link
              href={nextHref}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {t("next")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-400 opacity-40 pointer-events-none">
              {t("next")}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
