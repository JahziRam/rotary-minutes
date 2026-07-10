"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, FileText } from "lucide-react";
import { GuidedEmptyStateClient } from "@/components/assistance/guided-empty-state-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListPagination, useClientList } from "@/components/ui/list-controls";
import { matchesAny } from "@/lib/client-list";
import { getMinuteStatusLabel, getMinuteStatusVariant } from "@/lib/minute-status";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

export interface MinuteListItem {
  id: string;
  title: string;
  status: string;
  meetingDate: string;
  meetingType?: string;
  authorName?: string;
}

const MEETING_TYPES = [
  "STATUTORY",
  "COMMITTEE",
  "COMMISSION",
  "GENERAL_ASSEMBLY",
  "JOINT_MEETING",
  "GOVERNOR_VISIT",
  "TRAINING",
  "SPECIAL",
] as const;

const STATUSES = ["DRAFT", "IN_PROGRESS", "REVIEW", "FINALIZED", "ARCHIVED"] as const;

export function MinutesList({
  minutes,
  initialQuery = "",
  initialStatus = "",
  initialType = "",
  initialYear = "",
  showArchived = false,
}: {
  minutes: MinuteListItem[];
  initialQuery?: string;
  initialStatus?: string;
  initialType?: string;
  initialYear?: string;
  showArchived?: boolean;
}) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations();
  const dateLocale = locale === "fr" ? fr : enUS;
  const base = `/${locale}/minutes`;

  const filterFn = useCallback(
    (pv: MinuteListItem, q: string) =>
      matchesAny([pv.title, pv.status, pv.meetingType, pv.authorName], q),
    []
  );
  const { page, setPage, pageSlice, filtered } = useClientList(minutes, filterFn, 12);

  function applyFilters(fd: FormData) {
    const params = new URLSearchParams();
    const q = (fd.get("q") as string)?.trim();
    const status = fd.get("status") as string;
    const type = fd.get("type") as string;
    const year = fd.get("year") as string;
    const archived = fd.get("archived") === "on" ? "1" : "";
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (year) params.set("year", year);
    if (archived) params.set("archived", archived);
    router.push(`${base}?${params.toString()}`);
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <form action={applyFilters} className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              name="q"
              type="search"
              defaultValue={initialQuery}
              placeholder={t("common.search")}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <select
            name="status"
            defaultValue={initialStatus}
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
          >
            <option value="">{locale === "fr" ? "Tous statuts" : "All statuses"}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {getMinuteStatusLabel(s, (k) => t(k as "minutes.finalized"))}
              </option>
            ))}
          </select>
          <select
            name="type"
            defaultValue={initialType}
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
          >
            <option value="">{locale === "fr" ? "Tous types" : "All types"}</option>
            {MEETING_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>
          <select
            name="year"
            defaultValue={initialYear}
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
          >
            <option value="">{locale === "fr" ? "Toutes années" : "All years"}</option>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 px-4 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light"
          >
            {t("common.filter")}
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            name="archived"
            defaultChecked={showArchived}
            className="rounded border-gray-300"
          />
          {t("minutes.archived")}
        </label>
      </form>

      <div className="space-y-3">
        {minutes.length === 0 ? (
          <GuidedEmptyStateClient stateKey="minutes" />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">{t("common.noResults")}</p>
        ) : (
          pageSlice.items.map((pv) => (
            <Link key={pv.id} href={`/${locale}/minutes/${pv.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-navy/10 flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{pv.title}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(pv.meetingDate), "d MMMM yyyy", { locale: dateLocale })}
                      {pv.meetingType ? ` · ${pv.meetingType}` : ""}
                      {pv.authorName ? ` · ${pv.authorName}` : ""}
                    </p>
                  </div>
                  <Badge variant={getMinuteStatusVariant(pv.status)}>
                    {getMinuteStatusLabel(pv.status, (k) => t(k as "minutes.finalized"))}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      <ListPagination
        page={page}
        totalPages={pageSlice.totalPages}
        total={pageSlice.total}
        start={pageSlice.start}
        end={pageSlice.end}
        onPageChange={setPage}
      />
    </div>
  );
}