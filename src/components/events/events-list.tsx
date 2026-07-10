"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Plus, MapPin, Users, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import {
  ListPagination,
  ListToolbar,
  useClientList,
} from "@/components/ui/list-controls";
import { matchesAny } from "@/lib/client-list";
import { createEvent } from "@/actions/events";
import type { ClubEventStatus } from "@/generated/prisma/client";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  status: ClubEventStatus;
  maxAttendees: number | null;
  price: number | null;
  currency: string;
  requiresPayment: boolean;
  registrationCount: number;
};

const STATUS_VARIANT: Record<ClubEventStatus, "success" | "warning" | "danger" | "muted" | "default"> = {
  PUBLISHED: "success",
  DRAFT: "muted",
  CANCELLED: "danger",
  COMPLETED: "default",
};

export function EventsList({
  events,
  canManage,
  locale,
}: {
  events: EventRow[];
  canManage: boolean;
  locale: string;
}) {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | ClubEventStatus>("");
  const dateLocale = locale === "fr" ? fr : enUS;

  const filterFn = useCallback(
    (event: EventRow, q: string) => {
      if (statusFilter && event.status !== statusFilter) return false;
      return matchesAny(
        [event.title, event.location, event.description, event.status],
        q
      );
    },
    [statusFilter]
  );
  const { query, setQuery, page, setPage, pageSlice, filtered } = useClientList(
    events,
    filterFn,
    12
  );

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createEvent({
        title: fd.get("title") as string,
        description: (fd.get("description") as string) || undefined,
        location: (fd.get("location") as string) || undefined,
        startAt: fd.get("startAt") as string,
        endAt: (fd.get("endAt") as string) || undefined,
        maxAttendees: fd.get("maxAttendees") ? Number(fd.get("maxAttendees")) : undefined,
        price: fd.get("price") ? Number(fd.get("price")) : undefined,
        requiresPayment: fd.get("requiresPayment") === "on",
      });
      if ("success" in result && result.success) {
        setToast(t("created"));
        setShowForm(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6" data-assist="events-list">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} data-assist="events-new-btn">
            <Plus className="h-4 w-4" />
            {t("create")}
          </Button>
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
              <Input name="title" label={t("eventTitle")} required />
              <Input name="location" label={t("location")} />
              <Input name="startAt" type="datetime-local" label={t("startAt")} required />
              <Input name="endAt" type="datetime-local" label={t("endAt")} />
              <Input name="maxAttendees" type="number" label={t("maxAttendees")} />
              <Input name="price" type="number" step="0.01" label={t("price")} />
              <div className="sm:col-span-2">
                <Input name="description" label={t("description")} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="requiresPayment" className="rounded" />
                {t("requiresPayment")}
              </label>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={pending}>{t("save")}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {events.length > 0 && (
        <ListToolbar query={query} onQueryChange={setQuery}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | ClubEventStatus)}
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white"
          >
            <option value="">{tCommon("all")}</option>
            {(["PUBLISHED", "DRAFT", "COMPLETED", "CANCELLED"] as ClubEventStatus[]).map(
              (s) => (
                <option key={s} value={s}>
                  {t(`statuses.${s}`)}
                </option>
              )
            )}
          </select>
        </ListToolbar>
      )}

      {events.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t("noEvents")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{tCommon("noResults")}</p>
      ) : (
        <div className="grid gap-4">
          {pageSlice.items.map((event) => (
            <Link key={event.id} href={`/${locale}/events/${event.id}`}>
              <Card className="hover:border-navy/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{event.title}</h3>
                        <Badge variant={STATUS_VARIANT[event.status]}>
                          {t(`statuses.${event.status}`)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(event.startAt), "PPp", { locale: dateLocale })}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {event.registrationCount}
                          {event.maxAttendees ? ` / ${event.maxAttendees}` : ""}
                        </span>
                      </div>
                      {event.price != null && event.price > 0 && (
                        <p className="text-sm font-medium text-navy">
                          {event.price.toFixed(2)} {event.currency}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ListPagination
        page={page}
        totalPages={pageSlice.totalPages}
        total={pageSlice.total}
        start={pageSlice.start}
        end={pageSlice.end}
        onPageChange={setPage}
      />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}