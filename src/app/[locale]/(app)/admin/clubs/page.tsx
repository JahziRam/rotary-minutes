import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAdminClubs } from "@/lib/queries/admin";
import { adminQuery } from "@/lib/admin-safe";
import { AdminErrorBanner } from "@/components/admin/admin-error-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_FEATURES } from "@/lib/features";
import { ClubsTable, type AdminClubRow } from "@/components/admin/clubs-table";
import { FileText } from "lucide-react";

export default async function AdminClubsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const clubs = await adminQuery("clubs", () => getAdminClubs(), []);
  const clubRows: AdminClubRow[] = clubs.map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    country: c.country,
    district: c.district,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    counts: {
      members: c._count.members,
      meetings: c._count.meetings,
      minutes: c._count.minutes,
      users: c._count.memberships,
    },
    subscription: c.subscription
      ? {
          plan: c.subscription.plan,
          status: c.subscription.status,
          trialEndsAt: c.subscription.trialEndsAt?.toISOString() ?? null,
        }
      : null,
    features: c.features
      ? {
          emailsEnabled: c.features.emailsEnabled,
          statisticsEnabled: c.features.statisticsEnabled,
          districtDashboard: c.features.districtDashboard,
          pdfExport: c.features.pdfExport,
          offlineMode: c.features.offlineMode,
          liveMeetings: c.features.liveMeetings,
          emailsMenuVisible: c.features.emailsMenuVisible,
          statisticsMenuVisible: c.features.statisticsMenuVisible,
          pdfMenuVisible: c.features.pdfMenuVisible,
          liveMeetingsMenuVisible: c.features.liveMeetingsMenuVisible,
          districtMenuVisible: c.features.districtMenuVisible,
          offlineMenuVisible: c.features.offlineMenuVisible,
          apiAccessEnabled: c.features.apiAccessEnabled,
          duesEnabled: c.features.duesEnabled ?? DEFAULT_FEATURES.duesEnabled,
          duesMenuVisible: c.features.duesMenuVisible ?? DEFAULT_FEATURES.duesMenuVisible,
          treasuryEnabled: c.features.treasuryEnabled ?? DEFAULT_FEATURES.treasuryEnabled,
          treasuryMenuVisible: c.features.treasuryMenuVisible ?? DEFAULT_FEATURES.treasuryMenuVisible,
          actionsEnabled: c.features.actionsEnabled ?? DEFAULT_FEATURES.actionsEnabled,
          actionsMenuVisible: c.features.actionsMenuVisible ?? DEFAULT_FEATURES.actionsMenuVisible,
          calendarEnabled: c.features.calendarEnabled ?? DEFAULT_FEATURES.calendarEnabled,
          calendarMenuVisible: c.features.calendarMenuVisible ?? DEFAULT_FEATURES.calendarMenuVisible,
          memberPortalEnabled: c.features.memberPortalEnabled ?? DEFAULT_FEATURES.memberPortalEnabled,
          memberPortalMenuVisible: c.features.memberPortalMenuVisible ?? DEFAULT_FEATURES.memberPortalMenuVisible,
          attendanceReportsEnabled: c.features.attendanceReportsEnabled ?? DEFAULT_FEATURES.attendanceReportsEnabled,
          attendanceReportsMenuVisible: c.features.attendanceReportsMenuVisible ?? DEFAULT_FEATURES.attendanceReportsMenuVisible,
          eventsEnabled: c.features.eventsEnabled ?? DEFAULT_FEATURES.eventsEnabled,
          eventsMenuVisible: c.features.eventsMenuVisible ?? DEFAULT_FEATURES.eventsMenuVisible,
          documentsEnabled: c.features.documentsEnabled ?? DEFAULT_FEATURES.documentsEnabled,
          documentsMenuVisible: c.features.documentsMenuVisible ?? DEFAULT_FEATURES.documentsMenuVisible,
          governanceEnabled: c.features.governanceEnabled ?? DEFAULT_FEATURES.governanceEnabled,
          governanceMenuVisible: c.features.governanceMenuVisible ?? DEFAULT_FEATURES.governanceMenuVisible,
          smartNotificationsEnabled: c.features.smartNotificationsEnabled ?? DEFAULT_FEATURES.smartNotificationsEnabled,
          integrationsEnabled: c.features.integrationsEnabled ?? DEFAULT_FEATURES.integrationsEnabled,
          integrationsMenuVisible: c.features.integrationsMenuVisible ?? DEFAULT_FEATURES.integrationsMenuVisible,
          pwaEnhancedEnabled: c.features.pwaEnhancedEnabled ?? DEFAULT_FEATURES.pwaEnhancedEnabled,
          memberLimit: c.features.memberLimit,
        }
      : DEFAULT_FEATURES,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-navy" />
          {t("clubs.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {clubs.length === 0 ? (
          <AdminErrorBanner message="Aucun club chargé. Vérifiez la connexion à la base de données." />
        ) : null}
        <ClubsTable clubs={clubRows} />
      </CardContent>
    </Card>
  );
}