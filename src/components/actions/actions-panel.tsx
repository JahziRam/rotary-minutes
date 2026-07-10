"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  LayoutGrid,
  List,
  Mail,
  Download,
  Plus,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import {
  ListPagination,
  ListToolbar,
  useClientList,
} from "@/components/ui/list-controls";
import { matchesAny } from "@/lib/client-list";
import {
  createAction,
  updateActionStatus,
  sendActionReminder,
  exportActions,
} from "@/actions/club-actions";
import type { ClubActionPriority, ClubActionStatus } from "@/generated/prisma/client";

type ActionRow = {
  id: string;
  title: string;
  description: string | null;
  status: ClubActionStatus;
  priority: ClubActionPriority;
  dueDate: string | null;
  responsibleMemberId: string | null;
  responsibleName: string | null;
  responsibleEmail: string | null;
  minuteId: string | null;
  minuteTitle: string | null;
};

type Member = { id: string; firstName: string; lastName: string };

const STATUS_VARIANT: Record<
  ClubActionStatus,
  "success" | "warning" | "danger" | "muted" | "default"
> = {
  OPEN: "warning",
  IN_PROGRESS: "default",
  COMPLETED: "success",
  CANCELLED: "muted",
  DEFERRED: "muted",
};

const KANBAN_COLUMNS: ClubActionStatus[] = ["OPEN", "IN_PROGRESS", "COMPLETED"];

export function ActionsPanel({
  actions,
  members,
  canManage,
  locale,
}: {
  actions: ActionRow[];
  members: Member[];
  canManage: boolean;
  locale: string;
}) {
  const t = useTranslations("actions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [statusFilter, setStatusFilter] = useState<"" | ClubActionStatus>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    responsibleMemberId: "",
    dueDate: "",
    priority: "NORMAL" as ClubActionPriority,
  });
  const dateLocale = locale === "fr" ? fr : enUS;

  const filterFn = useCallback(
    (a: ActionRow, q: string) => {
      if (statusFilter && a.status !== statusFilter) return false;
      return matchesAny(
        [a.title, a.description, a.responsibleName, a.minuteTitle, a.status, a.priority],
        q
      );
    },
    [statusFilter]
  );
  const { query, setQuery, page, setPage, pageSlice, filtered } = useClientList(
    actions,
    filterFn,
    15
  );

  function run<T extends { success?: boolean; error?: string; message?: string; csv?: string }>(
    action: () => Promise<T>,
    okMsg: string
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        if (result.csv) {
          const blob = new Blob([result.csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "actions.csv";
          a.click();
          URL.revokeObjectURL(url);
        }
        setToast(result.message ?? okMsg);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <ListToolbar query={query} onQueryChange={setQuery}>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={view === "kanban" ? "gold" : "outline"}
                onClick={() => setView("kanban")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={view === "table" ? "gold" : "outline"}
                onClick={() => setView("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "" | ClubActionStatus)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white h-10"
              >
                <option value="">{t("allStatuses")}</option>
                {(
                  ["OPEN", "IN_PROGRESS", "COMPLETED", "DEFERRED", "CANCELLED"] as const
                ).map((s) => (
                  <option key={s} value={s}>
                    {t(`statuses.${s}`)}
                  </option>
                ))}
              </select>
            </div>
          </ListToolbar>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => exportActions(), t("exported"))}
            >
              <Download className="h-4 w-4 mr-1" />
              {t("exportCsv")}
            </Button>
            {canManage && (
              <Button size="sm" variant="gold" onClick={() => setShowForm(!showForm)}>
                <Plus className="h-4 w-4 mr-1" />
                {t("addAction")}
              </Button>
            )}
          </div>
        </div>

        {showForm && canManage && (
          <Card className="p-4 space-y-3">
            <input
              type="text"
              placeholder={t("fieldTitle")}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            />
            <textarea
              placeholder={t("description")}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 min-h-[60px]"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={form.responsibleMemberId}
                onChange={(e) => setForm({ ...form, responsibleMemberId: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="">{t("noResponsible")}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              />
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value as ClubActionPriority })
                }
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                {(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((p) => (
                  <option key={p} value={p}>
                    {t(`priorities.${p}`)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              variant="gold"
              disabled={pending || !form.title}
              onClick={() =>
                run(
                  () =>
                    createAction({
                      title: form.title,
                      description: form.description || undefined,
                      responsibleMemberId: form.responsibleMemberId || undefined,
                      dueDate: form.dueDate || undefined,
                      priority: form.priority,
                    }),
                  t("actionCreated")
                )
              }
            >
              {t("saveAction")}
            </Button>
          </Card>
        )}

        {view === "kanban" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {KANBAN_COLUMNS.map((status) => {
              const column = filtered.filter((a) => a.status === status);
              return (
                <div key={status} className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {t(`statuses.${status}`)}
                    </h3>
                    <Badge variant="muted">{column.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {column.map((action) => (
                      <Card key={action.id} className="p-3 bg-white">
                        <p className="font-medium text-sm text-gray-900">{action.title}</p>
                        {action.responsibleName && (
                          <p className="text-xs text-gray-500 mt-1">{action.responsibleName}</p>
                        )}
                        {action.dueDate && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {format(new Date(action.dueDate), "PP", { locale: dateLocale })}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {canManage && status !== "COMPLETED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2"
                              disabled={pending}
                              onClick={() =>
                                run(
                                  () =>
                                    updateActionStatus(
                                      action.id,
                                      status === "OPEN" ? "IN_PROGRESS" : "COMPLETED"
                                    ),
                                  t("statusUpdated")
                                )
                              }
                            >
                              {status === "OPEN" ? t("start") : t("complete")}
                            </Button>
                          )}
                          {canManage && action.responsibleEmail && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1"
                              disabled={pending}
                              onClick={() =>
                                run(
                                  () => sendActionReminder(action.id, locale),
                                  t("reminderSent")
                                )
                              }
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                          )}
                          {action.minuteId && (
                            <Link
                              href={`/${locale}/minutes/${action.minuteId}`}
                              className="inline-flex items-center text-[10px] text-navy hover:underline"
                            >
                              <ExternalLink className="h-3 w-3 mr-0.5" />
                              PV
                            </Link>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">{t("fieldTitle")}</th>
                  <th className="px-4 py-3 font-medium">{t("responsible")}</th>
                  <th className="px-4 py-3 font-medium">{t("dueDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("status")}</th>
                  <th className="px-4 py-3 font-medium">{t("priority")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageSlice.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {t("noActions")}
                    </td>
                  </tr>
                ) : (
                  pageSlice.items.map((action) => (
                    <tr key={action.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{action.title}</p>
                        {action.minuteTitle && (
                          <Link
                            href={`/${locale}/minutes/${action.minuteId}`}
                            className="text-xs text-navy hover:underline"
                          >
                            {action.minuteTitle}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{action.responsibleName ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {action.dueDate
                          ? format(new Date(action.dueDate), "PP", { locale: dateLocale })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[action.status]}>
                          {t(`statuses.${action.status}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {t(`priorities.${action.priority}`)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage && (
                          <div className="flex justify-end gap-1">
                            {action.status !== "COMPLETED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={pending}
                                onClick={() =>
                                  run(
                                    () =>
                                      updateActionStatus(
                                        action.id,
                                        action.status === "OPEN" ? "IN_PROGRESS" : "COMPLETED"
                                      ),
                                    t("statusUpdated")
                                  )
                                }
                              >
                                {action.status === "OPEN" ? t("start") : t("complete")}
                              </Button>
                            )}
                            {action.responsibleEmail && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7"
                                disabled={pending}
                                onClick={() =>
                                  run(
                                    () => sendActionReminder(action.id, locale),
                                    t("reminderSent")
                                  )
                                }
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {view === "table" && (
          <ListPagination
            page={page}
            totalPages={pageSlice.totalPages}
            total={pageSlice.total}
            start={pageSlice.start}
            end={pageSlice.end}
            onPageChange={setPage}
          />
        )}
        {view === "kanban" && filtered.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">{tCommon("noResults")}</p>
        )}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}