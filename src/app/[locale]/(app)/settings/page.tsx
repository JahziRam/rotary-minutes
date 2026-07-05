import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getClubContext } from "@/lib/club-context";
import { hasRolePermission } from "@/lib/roles";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClubSettingsForm } from "@/components/settings/club-settings-form";
import { PrivacyPanel } from "@/components/settings/privacy-panel";
import { AuditExportButton } from "@/components/settings/audit-export-button";
import { getGdprRequests } from "@/actions/gdpr";
import { clubHasApiAccess } from "@/lib/api-auth";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const ctx = await getClubContext();
  const club = ctx?.club;
  const canManageUsers =
    ctx &&
    (ctx.isSuperAdmin ||
      (await hasRolePermission(ctx.role, "users.manage", false)));
  const canManageSettings =
    ctx &&
    (ctx.isSuperAdmin ||
      (await hasRolePermission(ctx.role, "settings.manage", false)));
  const gdprRequests = await getGdprRequests();
  const apiAccess =
    club && canManageSettings
      ? await clubHasApiAccess(club.id)
      : false;

  return (
    <AppShellServer title={t("settings.title")}>
      <div className="max-w-2xl space-y-6">
        {club ? (
          <>
            <Card>
              <CardHeader><CardTitle>{t("settings.club")}</CardTitle></CardHeader>
              <CardContent>
                <ClubSettingsForm club={club} />
              </CardContent>
            </Card>

            {canManageUsers && (
              <Card>
                <CardHeader><CardTitle>{t("settings.users")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-navy/5 border border-navy/10">
                    <p className="text-sm text-gray-600">
                      Gérez les accès et rôles des utilisateurs de votre club.
                    </p>
                    <Link
                      href={`/${locale}/settings/users`}
                      className="inline-flex items-center justify-center h-10 px-4 rounded-lg text-sm font-medium bg-navy text-white hover:bg-navy-light transition-colors shrink-0"
                    >
                      {t("settings.users")}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>{t("settings.subscription")}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-gold/10 border border-gold/20">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {club.subscription?.plan ?? "TRIAL"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Statut : {club.subscription?.status ?? "TRIALING"}
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/settings/subscription`}
                    className="inline-flex items-center justify-center h-10 px-4 rounded-lg text-sm font-medium bg-navy text-white hover:bg-navy-light transition-colors"
                  >
                    Choisir un abonnement
                  </Link>
                </div>
              </CardContent>
            </Card>

            {canManageSettings && apiAccess && (
              <Card>
                <CardHeader><CardTitle>{t("integrations.title")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-navy/5 border border-navy/10">
                    <p className="text-sm text-gray-600">{t("integrations.cardDescription")}</p>
                    <Link
                      href={`/${locale}/settings/integrations`}
                      className="inline-flex items-center justify-center h-10 px-4 rounded-lg text-sm font-medium bg-navy text-white hover:bg-navy-light transition-colors shrink-0"
                    >
                      {t("integrations.manage")}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {canManageSettings && (
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>{t("gdpr.auditTitle")}</CardTitle>
                  <AuditExportButton />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{t("gdpr.auditDescription")}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>{t("gdpr.title")}</CardTitle></CardHeader>
              <CardContent>
                {gdprRequests ? (
                  <PrivacyPanel
                    exports={gdprRequests.exports}
                    deletions={gdprRequests.deletions}
                  />
                ) : (
                  <p className="text-sm text-gray-500">{t("gdpr.loginRequired")}</p>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="text-gray-500">Aucun club associé</p>
        )}
      </div>
    </AppShellServer>
  );
}