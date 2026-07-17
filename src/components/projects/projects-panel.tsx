"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Download, FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import {
  ListPagination,
  ListToolbar,
  useClientList,
} from "@/components/ui/list-controls";
import { matchesAny } from "@/lib/client-list";
import { createProject } from "@/actions/club-projects";
import { exportProjectsCsv } from "@/actions/exports-work";
import { AssigneePicker } from "@/components/ui/assignee-picker";
import type { ClubProjectStatus } from "@/generated/prisma/client";

export type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: ClubProjectStatus;
  startDate: string | null;
  endDate: string | null;
  color: string | null;
  ownerMemberId: string | null;
  ownerName: string | null;
  assigneeLabel?: string | null;
  commissionName?: string | null;
  taskCount: number;
  openTaskCount: number;
  completedTaskCount: number;
  createdAt: string;
  updatedAt: string;
};

type Member = { id: string; firstName: string; lastName: string };
type Commission = { id: string; name: string };

const STATUS_VARIANT: Record<
  ClubProjectStatus,
  "success" | "warning" | "danger" | "muted" | "default"
> = {
  PLANNING: "muted",
  ACTIVE: "default",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export function ProjectsPanel({
  projects,
  members,
  commissions = [],
  canManage,
  locale,
}: {
  projects: ProjectRow[];
  members: Member[];
  commissions?: Commission[];
  canManage: boolean;
  locale: string;
}) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const tAssign = useTranslations("assignees");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | ClubProjectStatus>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "PLANNING" as ClubProjectStatus,
    startDate: "",
    endDate: "",
    assigneeMemberIds: [] as string[],
    commissionId: "",
  });
  const dateLocale = locale === "fr" ? fr : enUS;

  const filterFn = useCallback(
    (p: ProjectRow, q: string) => {
      if (statusFilter && p.status !== statusFilter) return false;
      return matchesAny(
        [p.name, p.description, p.ownerName, p.assigneeLabel, p.commissionName, p.status],
        q
      );
    },
    [statusFilter]
  );
  const { query, setQuery, page, setPage, pageSlice, filtered } = useClientList(
    projects,
    filterFn,
    12
  );

  function submitProject() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      const result = await createProject({
        name: form.name,
        description: form.description || undefined,
        status: form.status,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        assigneeMemberIds: form.assigneeMemberIds,
        commissionId: form.commissionId || undefined,
      });
      if ("success" in result && result.success) {
        setToast(t("projectCreated"));
        setShowForm(false);
        setForm({
          name: "",
          description: "",
          status: "PLANNING",
          startDate: "",
          endDate: "",
          assigneeMemberIds: [],
          commissionId: "",
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-navy" />
            {t("title")}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const r = await exportProjectsCsv();
                if ("success" in r && r.success && r.csv) {
                  const blob = new Blob([r.csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = r.filename;
                  a.click();
                  URL.revokeObjectURL(url);
                  setToast(t("exported"));
                }
              });
            }}
          >
            <Download className="h-4 w-4" />
            {t("exportCsv")}
          </Button>
          {canManage && (
            <Button size="sm" variant="gold" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4" />
              {t("addProject")}
            </Button>
          )}
        </div>
      </div>

      {showForm && canManage && (
        <Card>
          <CardContent className="pt-4 grid sm:grid-cols-2 gap-3">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">{t("fieldName")}</span>
              <input
                className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">{t("description")}</span>
              <textarea
                className="flex min-h-20 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">{t("status")}</span>
              <select
                className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as ClubProjectStatus }))
                }
              >
                {(
                  ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const
                ).map((s) => (
                  <option key={s} value={s}>
                    {t(`statuses.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2">
              <AssigneePicker
                members={members}
                commissions={commissions}
                selectedMemberIds={form.assigneeMemberIds}
                commissionId={form.commissionId}
                onMembersChange={(ids) =>
                  setForm((f) => ({ ...f, assigneeMemberIds: ids }))
                }
                onCommissionChange={(id) => setForm((f) => ({ ...f, commissionId: id }))}
                membersLabel={tAssign("members")}
                commissionLabel={tAssign("commission")}
                noCommissionLabel={tAssign("noCommission")}
              />
            </div>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">{t("startDate")}</span>
              <input
                type="date"
                className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">{t("endDate")}</span>
              <input
                type="date"
                className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <Button size="sm" onClick={submitProject} disabled={pending || !form.name.trim()}>
                {t("saveProject")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                {tCommon("cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ListToolbar query={query} onQueryChange={setQuery}>
        <select
          className="h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "" | ClubProjectStatus);
            setPage(1);
          }}
        >
          <option value="">{t("allStatuses")}</option>
          {(
            ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const
          ).map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </select>
      </ListToolbar>

      {pageSlice.items.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">{t("noProjects")}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageSlice.items.map((p) => (
            <Link key={p.id} href={`/${locale}/projects/${p.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{p.name}</CardTitle>
                    <Badge variant={STATUS_VARIANT[p.status]}>
                      {t(`statuses.${p.status}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-600">
                  {p.description && (
                    <p className="line-clamp-2 text-gray-500">{p.description}</p>
                  )}
                  <p>
                    {t("tasksProgress", {
                      open: p.openTaskCount,
                      done: p.completedTaskCount,
                      total: p.taskCount,
                    })}
                  </p>
                  <p className="text-xs text-gray-400">
                    {p.assigneeLabel || p.ownerName
                      ? t("ownedBy", { name: p.assigneeLabel || p.ownerName || "" })
                      : t("noOwner")}
                    {p.endDate
                      ? ` · ${t("endsOn", {
                          date: format(new Date(p.endDate), "d MMM yyyy", {
                            locale: dateLocale,
                          }),
                        })}`
                      : ""}
                  </p>
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
