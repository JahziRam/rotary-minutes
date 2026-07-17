"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import {
  createProjectTask,
  deleteProject,
  updateProject,
  updateProjectTaskStatus,
} from "@/actions/club-projects";
import { ProjectBudgetPanel } from "@/components/projects/project-budget-panel";
import { AssigneePicker } from "@/components/ui/assignee-picker";
import type {
  BudgetDocumentKind,
  ClubActionPriority,
  ClubActionStatus,
  ClubProjectStatus,
} from "@/generated/prisma/client";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: ClubActionStatus;
  priority: ClubActionPriority;
  dueDate: string | null;
  responsibleMemberId: string | null;
  responsibleName: string | null;
  assigneeLabel?: string | null;
  commissionName?: string | null;
  minuteId: string | null;
  minuteTitle: string | null;
};

type ProjectDetail = {
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
  budgetPlanned: number | null;
  budgetNotes: string | null;
  budget: {
    planned: number | null;
    income: number;
    expense: number;
    actual: number;
    variance: number | null;
  };
  budgetEntries: Array<{
    id: string;
    type: "INCOME" | "EXPENSE";
    amount: number;
    currency: string;
    date: string;
    description: string;
  }>;
  budgetDocuments: Array<{
    id: string;
    kind: BudgetDocumentKind;
    label: string | null;
    fileName: string;
    mimeType: string;
    amount: number | null;
    notes: string | null;
    createdAt: string;
    viewUrl: string;
    downloadUrl: string;
  }>;
  tasks: TaskRow[];
};

type Member = { id: string; firstName: string; lastName: string };

const PROJECT_STATUS_VARIANT: Record<
  ClubProjectStatus,
  "success" | "warning" | "danger" | "muted" | "default"
> = {
  PLANNING: "muted",
  ACTIVE: "default",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const TASK_STATUS_VARIANT: Record<
  ClubActionStatus,
  "success" | "warning" | "danger" | "muted" | "default"
> = {
  OPEN: "warning",
  IN_PROGRESS: "default",
  COMPLETED: "success",
  CANCELLED: "muted",
  DEFERRED: "muted",
};

export function ProjectDetailPanel({
  project,
  members,
  commissions = [],
  canManage,
  locale,
  currency,
}: {
  project: ProjectDetail;
  members: Member[];
  commissions?: Array<{ id: string; name: string }>;
  canManage: boolean;
  locale: string;
  currency: string;
}) {
  const t = useTranslations("projects");
  const tActions = useTranslations("actions");
  const tAssign = useTranslations("assignees");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigneeMemberIds: [] as string[],
    commissionId: "",
    dueDate: "",
    priority: "NORMAL" as ClubActionPriority,
  });
  const dateLocale = locale === "fr" ? fr : enUS;

  function setStatus(status: ClubProjectStatus) {
    startTransition(async () => {
      const result = await updateProject(project.id, { status });
      if ("success" in result && result.success) {
        setToast(t("statusUpdated"));
        router.refresh();
      }
    });
  }

  function removeProject() {
    if (!confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      const result = await deleteProject(project.id);
      if ("success" in result && result.success) {
        router.push(`/${locale}/projects`);
        router.refresh();
      }
    });
  }

  function addTask() {
    if (!taskForm.title.trim()) return;
    startTransition(async () => {
      const result = await createProjectTask(project.id, {
        title: taskForm.title,
        description: taskForm.description || undefined,
        assigneeMemberIds: taskForm.assigneeMemberIds,
        commissionId: taskForm.commissionId || undefined,
        dueDate: taskForm.dueDate || undefined,
        priority: taskForm.priority,
      });
      if ("success" in result && result.success) {
        setToast(t("taskCreated"));
        setShowTaskForm(false);
        setTaskForm({
          title: "",
          description: "",
          assigneeMemberIds: [],
          commissionId: "",
          dueDate: "",
          priority: "NORMAL",
        });
        router.refresh();
      }
    });
  }

  function setTaskStatus(taskId: string, status: ClubActionStatus) {
    startTransition(async () => {
      const result = await updateProjectTaskStatus(project.id, taskId, status);
      if ("success" in result && result.success) {
        setToast(tActions("statusUpdated"));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Link
            href={`/${locale}/projects`}
            className="inline-flex items-center gap-1 text-sm text-navy hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToList")}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
            <Badge variant={PROJECT_STATUS_VARIANT[project.status]}>
              {t(`statuses.${project.status}`)}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-gray-600 max-w-2xl">{project.description}</p>
          )}
          <p className="text-xs text-gray-400">
            {project.assigneeLabel || project.ownerName
              ? t("ownedBy", {
                  name: project.assigneeLabel || project.ownerName || "",
                })
              : t("noOwner")}
            {project.startDate
              ? ` · ${format(new Date(project.startDate), "d MMM yyyy", { locale: dateLocale })}`
              : ""}
            {project.endDate
              ? ` → ${format(new Date(project.endDate), "d MMM yyyy", { locale: dateLocale })}`
              : ""}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 rounded-lg border border-gray-200 px-2 text-sm"
              value={project.status}
              disabled={pending}
              onChange={(e) => setStatus(e.target.value as ClubProjectStatus)}
            >
              {(
                ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const
              ).map((s) => (
                <option key={s} value={s}>
                  {t(`statuses.${s}`)}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={removeProject} disabled={pending}>
              <Trash2 className="h-4 w-4" />
              {tCommon("delete")}
            </Button>
          </div>
        )}
      </div>

      <ProjectBudgetPanel
        projectId={project.id}
        currency={currency}
        locale={locale}
        canManage={canManage}
        budget={project.budget}
        budgetNotes={project.budgetNotes}
        entries={project.budgetEntries}
        documents={project.budgetDocuments}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">{t("tasksTitle")}</CardTitle>
          {canManage && (
            <Button size="sm" variant="gold" onClick={() => setShowTaskForm((v) => !v)}>
              <Plus className="h-4 w-4" />
              {t("addTask")}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {showTaskForm && canManage && (
            <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">{tActions("fieldTitle")}</span>
                <input
                  className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm bg-white"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">{tActions("description")}</span>
                <textarea
                  className="flex min-h-16 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </label>
              <div className="sm:col-span-2">
                <AssigneePicker
                  members={members}
                  commissions={commissions}
                  selectedMemberIds={taskForm.assigneeMemberIds}
                  commissionId={taskForm.commissionId}
                  onMembersChange={(ids) =>
                    setTaskForm((f) => ({ ...f, assigneeMemberIds: ids }))
                  }
                  onCommissionChange={(id) =>
                    setTaskForm((f) => ({ ...f, commissionId: id }))
                  }
                  membersLabel={tAssign("members")}
                  commissionLabel={tAssign("commission")}
                  noCommissionLabel={tAssign("noCommission")}
                />
              </div>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">{tActions("dueDate")}</span>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm bg-white"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">{tActions("priority")}</span>
                <select
                  className="flex h-10 w-full rounded-lg border border-gray-200 px-3 text-sm bg-white"
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm((f) => ({
                      ...f,
                      priority: e.target.value as ClubActionPriority,
                    }))
                  }
                >
                  {(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((p) => (
                    <option key={p} value={p}>
                      {tActions(`priorities.${p}`)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2 flex gap-2">
                <Button
                  size="sm"
                  onClick={addTask}
                  disabled={pending || !taskForm.title.trim()}
                >
                  {t("saveTask")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowTaskForm(false)}>
                  {tCommon("cancel")}
                </Button>
              </div>
            </div>
          )}

          {project.tasks.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">{t("noTasks")}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {project.tasks.map((task) => (
                <li
                  key={task.id}
                  className="py-3 flex flex-wrap items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-gray-900">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{task.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {task.assigneeLabel ||
                        task.responsibleName ||
                        tActions("noResponsible")}
                      {task.dueDate
                        ? ` · ${format(new Date(task.dueDate), "d MMM yyyy", {
                            locale: dateLocale,
                          })}`
                        : ""}
                      {task.minuteTitle ? ` · PV: ${task.minuteTitle}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={TASK_STATUS_VARIANT[task.status]}>
                      {tActions(`statuses.${task.status}`)}
                    </Badge>
                    {canManage && task.status !== "COMPLETED" && (
                      <div className="flex gap-1">
                        {task.status === "OPEN" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => setTaskStatus(task.id, "IN_PROGRESS")}
                          >
                            {tActions("start")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => setTaskStatus(task.id, "COMPLETED")}
                        >
                          {tActions("complete")}
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
