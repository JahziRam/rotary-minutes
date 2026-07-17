import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { listProjects } from "@/actions/club-projects";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { ProjectsPanel } from "@/components/projects/projects-panel";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");
  const ctx = await getClubContext();
  if (!ctx) return null;

  if (!isFeatureEnabled(ctx.features, "projectsEnabled", ctx.isSuperAdmin)) {
    redirect(`/${locale}/dashboard`);
  }

  const data = await listProjects();
  if ("error" in data) return null;

  return (
    <AppShellServer title={t("title")}>
      <ProjectsPanel
        projects={data.projects}
        members={data.members}
        commissions={data.commissions}
        canManage={data.canManage}
        locale={locale}
      />
    </AppShellServer>
  );
}
