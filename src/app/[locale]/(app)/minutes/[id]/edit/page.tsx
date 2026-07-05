import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMinuteById } from "@/actions/minutes";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled, isFeatureVisibleInUi } from "@/lib/feature-gate";
import { hasRolePermission } from "@/lib/roles";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { MinuteEditor } from "@/components/minutes/minute-editor";

export default async function MinuteEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const minute = await getMinuteById(id);
  if (!minute) notFound();

  const ctx = await getClubContext();
  if (!ctx) notFound();
  const pdfEnabled = ctx
    ? isFeatureEnabled(ctx.features, "pdfExport", ctx.isSuperAdmin)
    : true;
  const pdfVisible = ctx
    ? isFeatureVisibleInUi(ctx.features, "pdfExport", ctx.isSuperAdmin)
    : true;
  const canSubmit = ctx
    ? await hasRolePermission(ctx.role, "minutes.submit", ctx.isSuperAdmin)
    : false;
  const canApprove = ctx
    ? await hasRolePermission(ctx.role, "minutes.approve", ctx.isSuperAdmin)
    : false;

  return (
    <AppShellServer title={t("minutes.title")}>
      <MinuteEditor
        clubId={ctx.clubId}
        pdfEnabled={pdfEnabled}
        pdfVisible={pdfVisible}
        canSubmit={canSubmit}
        canApprove={canApprove}
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
    </AppShellServer>
  );
}