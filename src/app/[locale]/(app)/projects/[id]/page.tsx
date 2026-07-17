import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { getProject } from "@/actions/club-projects";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { ProjectDetailPanel } from "@/components/projects/project-detail-panel";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");
  const ctx = await getClubContext();
  if (!ctx) return null;

  if (!isFeatureEnabled(ctx.features, "projectsEnabled", ctx.isSuperAdmin)) {
    redirect(`/${locale}/dashboard`);
  }

  const data = await getProject(id);
  if ("error" in data) {
    if (data.error === "NOT_FOUND") notFound();
    return null;
  }

  return (
    <AppShellServer title={data.project.name || t("title")}>
      <ProjectDetailPanel
        project={data.project}
        members={data.members}
        canManage={data.canManage}
        locale={locale}
        currency={data.currency}
      />
    </AppShellServer>
  );
}
