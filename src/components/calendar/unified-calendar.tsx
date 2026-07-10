"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Download, List, CalendarDays, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import {
  createCalendarNote,
  deleteCalendarNote,
  exportCalendarIcs,
} from "@/actions/calendar";
import type { CalendarEventSource } from "@/generated/prisma/client";

type CalendarEvent = {
  id: string;
  source: CalendarEventSource;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  color?: string | null;
  link?: string | null;
};

const SOURCE_LABELS: CalendarEventSource[] = [
  "MEETING",
  "EVENT",
  "DUES",
  "ACTION",
  "BIRTHDAY",
  "CUSTOM",
];

export function UnifiedCalendar({
  events,
  month,
  prevMonth,
  nextMonth,
  canManage,
  locale,
}: {
  events: CalendarEvent[];
  month: string;
  prevMonth: string;
  nextMonth: string;
  canManage: boolean;
  locale: string;
}) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "list">("month");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", startAt: "", endAt: "" });
  const dateLocale = locale === "fr" ? fr : enUS;

  const monthDate = new Date(month);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDow = monthStart.getDay();
  const padDays = firstDow === 0 ? 6 : firstDow - 1;

  function eventsOnDay(day: Date) {
    return events.filter((e) => isSameDay(new Date(e.startAt), day));
  }

  function run<T extends { success?: boolean; error?: string; ics?: string; filename?: string }>(
    action: () => Promise<T>,
    okMsg: string
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        if (result.ics && result.filename) {
          const blob = new Blob([result.ics], { type: "text/calendar" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.filename;
          a.click();
          URL.revokeObjectURL(url);
        }
        setToast(okMsg);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2" data-assist="calendar-month-nav">
            <Link href={`/${locale}/calendar?month=${prevMonth.slice(0, 10)}`}>
              <Button size="sm" variant="outline">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h2 className="text-lg font-semibold text-gray-900 min-w-[160px] text-center capitalize">
              {format(monthDate, "MMMM yyyy", { locale: dateLocale })}
            </h2>
            <Link href={`/${locale}/calendar?month=${nextMonth.slice(0, 10)}`}>
              <Button size="sm" variant="outline">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={view === "month" ? "gold" : "outline"}
              onClick={() => setView("month")}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={view === "list" ? "gold" : "outline"}
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              data-assist="calendar-export"
              onClick={() => run(() => exportCalendarIcs(month), t("icsExported"))}
            >
              <Download className="h-4 w-4 mr-1" />
              {t("exportIcs")}
            </Button>
            {canManage && (
              <Button size="sm" variant="gold" onClick={() => setShowForm(!showForm)}>
                <Plus className="h-4 w-4 mr-1" />
                {t("addNote")}
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SOURCE_LABELS.map((source) => (
            <Badge key={source} variant="muted" className="text-[10px]">
              {t(`sources.${source}`)}
            </Badge>
          ))}
        </div>

        {showForm && canManage && (
          <Card className="p-4 space-y-3">
            <input
              type="text"
              placeholder={t("noteTitle")}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            />
            <textarea
              placeholder={t("noteDescription")}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
              <input
                type="date"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
            <Button
              size="sm"
              variant="gold"
              disabled={pending || !form.title || !form.startAt}
              onClick={() =>
                run(
                  () =>
                    createCalendarNote({
                      title: form.title,
                      description: form.description || undefined,
                      startAt: form.startAt,
                      endAt: form.endAt || undefined,
                    }),
                  t("noteCreated")
                )
              }
            >
              {t("saveNote")}
            </Button>
          </Card>
        )}

        {view === "month" ? (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
              {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
                <div
                  key={d}
                  className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                >
                  {t(`weekdays.${d}`)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: padDays }).map((_, i) => (
                <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/30" />
              ))}
              {days.map((day) => {
                const dayEvents = eventsOnDay(day);
                const inMonth = isSameMonth(day, monthDate);
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[80px] border-b border-r border-gray-100 p-1 ${
                      !inMonth ? "bg-gray-50/50" : ""
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday(day)
                          ? "bg-gold text-white font-bold"
                          : "text-gray-600"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="space-y-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-[9px] truncate rounded px-1 py-0.5 text-white"
                          style={{ backgroundColor: ev.color ?? "#64748b" }}
                          title={ev.title}
                        >
                          {ev.link ? (
                            <Link href={`/${locale}${ev.link}`}>{ev.title}</Link>
                          ) : (
                            ev.title
                          )}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-[9px] text-gray-400">+{dayEvents.length - 3}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {events.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">{t("noEvents")}</Card>
            ) : (
              events.map((ev) => (
                <Card key={ev.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    <div
                      className="w-1 rounded-full shrink-0 self-stretch"
                      style={{ backgroundColor: ev.color ?? "#64748b" }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900">{ev.title}</p>
                        <Badge variant="muted" className="text-[10px]">
                          {t(`sources.${ev.source}`)}
                        </Badge>
                      </div>
                      {ev.description && (
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{ev.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(ev.startAt), "EEEE d MMMM yyyy", { locale: dateLocale })}
                        {ev.endAt &&
                          ` — ${format(new Date(ev.endAt), "d MMM", { locale: dateLocale })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ev.link && (
                      <Link href={`/${locale}${ev.link}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs">
                          {t("view")}
                        </Button>
                      </Link>
                    )}
                    {canManage && ev.id.startsWith("note-") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-red-500"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => deleteCalendarNote(ev.id.replace("note-", "")),
                            t("noteDeleted")
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}