import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMinuteById } from "@/actions/minutes";
import { getClubContext } from "@/lib/club-context";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled, isFeatureVisibleInUi } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { MinuteEditor } from "@/components/minutes/minute-editor";
import { MinuteTaskAssignPanel } from "@/components/minutes/minute-task-assign-panel";
import { MinuteAutoGenerateButton } from "@/components/minutes/minute-auto-generate-button";
import { MinuteComments } from "@/components/minutes/minute-comments";
import { listMinuteComments } from "@/actions/minute-comments";
import { getMinuteAiStatus } from "@/actions/minute-ai";

export default async function MinuteEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ ended?: string }>;
}) {
  const { locale, id } = await params;
  const { ended } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  const minute = await getMinuteById(id);
  if (!minute) notFound();

  const ctx = await getClubContext();
  if (!ctx) notFound();
  const pdfEnabled = isFeatureEnabled(ctx.features, "pdfExport", ctx.isSuperAdmin);
  const pdfVisible = isFeatureVisibleInUi(ctx.features, "pdfExport", ctx.isSuperAdmin);
  const canSubmit = await hasRolePermission(ctx.role, "minutes.submit", ctx.isSuperAdmin);
  const canApprove = await hasRolePermission(ctx.role, "minutes.approve", ctx.isSuperAdmin);
  const canFinalize = await hasRolePermission(ctx.role, "minutes.finalize", ctx.isSuperAdmin);

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { presidentApprovalRequired: true },
  });
  const memberEmailCount = await prisma.member.count({
    where: {
      clubId: ctx.clubId,
      isActive: true,
      email: { not: null },
    },
  });

  const isLocked = ["FINALIZED", "ARCHIVED"].includes(minute.status);
  const [commentsResult, minuteAiStatus] = await Promise.all([
    listMinuteComments(id),
    getMinuteAiStatus(),
  ]);

  return (
    <AppShellServer title={t("minutes.title")}>
      <div className="space-y-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <MinuteAutoGenerateButton minuteId={minute.id} disabled={isLocked} />
        </div>
        <MinuteTaskAssignPanel minuteId={minute.id} />
      </div>
      <MinuteEditor
        clubId={ctx.clubId}
        pdfEnabled={pdfEnabled}
        pdfVisible={pdfVisible}
        canSubmit={canSubmit}
        canApprove={canApprove}
        canFinalize={canFinalize}
        presidentApprovalRequired={club?.presidentApprovalRequired ?? true}
        memberEmailCount={memberEmailCount}
        highlightPostMeeting={ended === "1"}
        minuteAiEnabled={
          "enabled" in minuteAiStatus ? !!minuteAiStatus.enabled : false
        }
        minuteAiRemaining={
          "remaining" in minuteAiStatus ? minuteAiStatus.remaining ?? 0 : 0
        }
        minute={{
          id: minute.id,
          title: minute.title,
          status: minute.status,
          reviewComment: minute.reviewComment,
          meeting: { ...minute.meeting, type: minute.meeting.type },
          agendaItems: minute.agendaItems.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description ?? "",
            decisions: item.decisions ?? "",
            actions: item.actions ?? "",
            responsible: item.responsible ?? "",
            dueDate: item.dueDate ? item.dueDate.toISOString().split("T")[0] : "",
            status: item.status,
          })),
        }}
      />
      <div className="mt-8 max-w-3xl">
        <MinuteComments
          minuteId={minute.id}
          initialComments={commentsResult.comments ?? []}
          canComment={!!commentsResult.canComment}
          canModerate={!!commentsResult.canModerate}
        />
      </div>
    </AppShellServer>
  );
}
