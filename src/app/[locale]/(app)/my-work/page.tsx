import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getClubContext } from "@/lib/club-context";
import { getSession } from "@/lib/cached-auth";
import {
  getMyAssignedActions,
  getMyAssignedProjects,
} from "@/lib/queries/my-work";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";

export default async function MyWorkPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("myWork");
  const ctx = await getClubContext();
  const session = await getSession();
  if (!ctx || !session?.user?.id) return null;

  const dateLocale = locale === "fr" ? fr : locale === "es" ? es : enUS;
  const [actions, projects] = await Promise.all([
    getMyAssignedActions(ctx.clubId, session.user.id),
    getMyAssignedProjects(ctx.clubId, session.user.id),
  ]);

  return (
    <AppShellServer title={t("title")}>
      <div className="space-y-6">
        <p className="text-sm text-gray-500">{t("subtitle")}</p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("myProjects")}</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noProjects")}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {projects.map((p) => (
                  <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <Link
                        href={`/${locale}/projects/${p.id}`}
                        className="font-medium text-navy hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {p.commission?.name ? `${p.commission.name} · ` : ""}
                        {t("tasksCount", { count: p._count.tasks })}
                      </p>
                    </div>
                    <Badge variant="muted">{p.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("myTasks")}</CardTitle>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noTasks")}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {actions.map((a) => (
                  <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{a.title}</p>
                      <p className="text-xs text-gray-400">
                        {a.project ? (
                          <Link
                            href={`/${locale}/projects/${a.project.id}`}
                            className="text-navy hover:underline"
                          >
                            {a.project.name}
                          </Link>
                        ) : (
                          <Link href={`/${locale}/actions`} className="text-navy hover:underline">
                            {t("openActions")}
                          </Link>
                        )}
                        {a.dueDate
                          ? ` · ${format(a.dueDate, "d MMM yyyy", { locale: dateLocale })}`
                          : ""}
                        {a.commission?.name ? ` · ${a.commission.name}` : ""}
                      </p>
                    </div>
                    <Badge variant="warning">{a.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShellServer>
  );
}
