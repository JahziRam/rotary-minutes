import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getMinuteById } from "@/actions/minutes";
import { getClubContext } from "@/lib/club-context";
import { canViewDistrictMinutes } from "@/lib/district-access";
import { isFeatureEnabled, isFeatureVisibleInUi } from "@/lib/feature-gate";
import { getVerifyUrl } from "@/lib/hash";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { MinutePreview } from "@/components/minutes/minute-preview";

export default async function MinuteDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await auth();
  const minute = await getMinuteById(id);
  if (!minute) notFound();

  const ctx = await getClubContext();
  const isOwnClubMinute = ctx?.clubId === minute.clubId;
  const isDistrictReadOnly =
    !isOwnClubMinute &&
    !!minute.club.district &&
    !!session?.user &&
    (session.user.isSuperAdmin ||
      (await canViewDistrictMinutes(session.user.id, minute.club.district)));
  const pdfEnabled = ctx
    ? isFeatureEnabled(ctx.features, "pdfExport", ctx.isSuperAdmin)
    : true;
  const pdfVisible = ctx
    ? isFeatureVisibleInUi(ctx.features, "pdfExport", ctx.isSuperAdmin)
    : true;
  const emailsEnabled = ctx
    ? isFeatureEnabled(ctx.features, "emailsEnabled", ctx.isSuperAdmin)
    : true;
  const emailsVisible = ctx
    ? isFeatureVisibleInUi(ctx.features, "emailsEnabled", ctx.isSuperAdmin)
    : true;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl =
    minute.verifyUrl ??
    (minute.contentHash ? getVerifyUrl(minute.contentHash, baseUrl) : null);

  let qrCodeDataUrl: string | null = null;
  if (verifyUrl) {
    const { default: QRCode } = await import("qrcode");
    qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { width: 128, margin: 1 });
  }

  return (
    <AppShellServer title="Aperçu du procès-verbal">
      <MinutePreview
        locale={locale}
        backHref={
          isDistrictReadOnly ? `/${locale}/district/minutes` : `/${locale}/minutes`
        }
        pdfEnabled={pdfEnabled && !isDistrictReadOnly}
        pdfVisible={pdfVisible && !isDistrictReadOnly}
        emailsEnabled={emailsEnabled && !isDistrictReadOnly}
        emailsVisible={emailsVisible && !isDistrictReadOnly}
        data={{
          id: minute.id,
          title: minute.title,
          status: minute.status,
          contentHash: minute.contentHash,
          verifyUrl,
          qrCodeDataUrl,
          club: {
            name: minute.club.name,
            address: minute.club.address,
            district: minute.club.district,
            country: minute.club.country,
            logoUrl: minute.club.logoUrl,
          },
          meeting: {
            date: minute.meeting.date,
            location: minute.meeting.location,
            startTime: minute.meeting.startTime,
            endTime: minute.meeting.endTime,
            type: minute.meeting.type,
            presidedBy: minute.meeting.presidedBy,
            secretary: minute.meeting.secretary,
            attendances: minute.meeting.attendances,
          },
          agendaItems: minute.agendaItems,
          versions: minute.versions,
        }}
      />
    </AppShellServer>
  );
}