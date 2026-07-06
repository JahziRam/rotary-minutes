import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAdminClubs } from "@/lib/queries/admin";
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

  const clubs = await getAdminClubs();
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
      <CardContent>
        <ClubsTable clubs={clubRows} />
      </CardContent>
    </Card>
  );
}