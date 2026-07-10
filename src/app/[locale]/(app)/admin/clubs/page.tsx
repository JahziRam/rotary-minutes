import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAdminClubs, getAdminClubsManagementData } from "@/lib/queries/admin";
import { adminQuery } from "@/lib/admin-safe";
import { AdminErrorBanner } from "@/components/admin/admin-error-banner";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_FEATURES } from "@/lib/features";
import { ClubsTable, type AdminClubRow } from "@/components/admin/clubs-table";
import type { AdminClubManagementData } from "@/components/admin/club-management-panel";

export default async function AdminClubsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("adminNav");
  const tPages = await getTranslations("adminPages");

  const [clubs, managementData] = await Promise.all([
    adminQuery("clubs", () => getAdminClubs(), []),
    adminQuery(
      "clubs-management",
      () => getAdminClubsManagementData(),
      { clubs: [], platformUsers: [], customRoles: [] }
    ),
  ]);

  const managementByClubId = Object.fromEntries(
    managementData.clubs.map((c) => [
      c.id,
      {
        id: c.id,
        slug: c.slug,
        name: c.name,
        type: c.type,
        city: c.city,
        country: c.country,
        district: c.district,
        address: c.address,
        email: c.email,
        phone: c.phone,
        website: c.website,
        language: c.language,
        isActive: c.isActive,
        members: c.members,
        memberships: c.memberships.map((m) => ({
          id: m.id,
          userId: m.user.id,
          email: m.user.email,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          role: m.role,
          customRoleId: m.customRoleId,
          customRoleLabel: m.customRole
            ? locale === "fr"
              ? m.customRole.labelFr
              : m.customRole.labelEn
            : null,
          isActive: m.isActive,
        })),
      } satisfies AdminClubManagementData,
    ])
  );

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
          eventsAdvancedEnabled: c.features.eventsAdvancedEnabled ?? DEFAULT_FEATURES.eventsAdvancedEnabled,
          eventsAdvancedMenuVisible: c.features.eventsAdvancedMenuVisible ?? DEFAULT_FEATURES.eventsAdvancedMenuVisible,
          fileManagerEnabled: c.features.fileManagerEnabled ?? DEFAULT_FEATURES.fileManagerEnabled,
          fileManagerMenuVisible: c.features.fileManagerMenuVisible ?? DEFAULT_FEATURES.fileManagerMenuVisible,
          documentSharingEnabled: c.features.documentSharingEnabled ?? DEFAULT_FEATURES.documentSharingEnabled,
          treasuryImportEnabled: c.features.treasuryImportEnabled ?? DEFAULT_FEATURES.treasuryImportEnabled,
          clubBackupEnabled: c.features.clubBackupEnabled ?? DEFAULT_FEATURES.clubBackupEnabled,
          memberLimit: c.features.memberLimit,
        }
      : DEFAULT_FEATURES,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader title={tNav("clubs")} description={tPages("clubs")} />
      <Card>
        <CardContent className="pt-6 space-y-4">
          {clubs.length === 0 ? (
            <AdminErrorBanner message="Aucun club chargé. Vérifiez la connexion à la base de données." />
          ) : null}
          <ClubsTable
            clubs={clubRows}
            managementByClubId={managementByClubId}
            platformUsers={managementData.platformUsers}
            customRoles={managementData.customRoles}
          />
        </CardContent>
      </Card>
    </div>
  );
}