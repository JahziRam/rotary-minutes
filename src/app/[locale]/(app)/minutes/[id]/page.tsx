import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getMinuteById } from "@/actions/minutes";
import { listMinuteComments } from "@/actions/minute-comments";
import { getClubContext } from "@/lib/club-context";
import { canViewDistrictMinutes } from "@/lib/district-access";
import { isFeatureEnabled, isFeatureVisibleInUi } from "@/lib/feature-gate";
import { resolveMinuteVerifyUrl } from "@/lib/hash";
import { getAppBaseUrl } from "@/lib/app-url";
import { resolveClubBrandLogoSrc } from "@/lib/club-logo-resolution";
import {
  canOverrideMinuteLock,
  isMinuteContentLocked,
} from "@/lib/minute-lock";
import { hasRolePermission } from "@/lib/roles";
import { getMinuteMemberEmailCount } from "@/actions/minutes";
import { AppShellServer } from "@/components/layout/app-shell-server";
import { MinutePreview } from "@/components/minutes/minute-preview";
import { MinuteComments } from "@/components/minutes/minute-comments";

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

  const baseUrl = getAppBaseUrl();
  const verifyUrl = resolveMinuteVerifyUrl(minute, locale);
  const memberEmailCount =
    minute.status === "FINALIZED" && isOwnClubMinute
      ? await getMinuteMemberEmailCount(id)
      : 0;

  let qrCodeDataUrl: string | null = null;
  if (verifyUrl) {
    const { default: QRCode } = await import("qrcode");
    qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { width: 128, margin: 1 });
  }

  const commentsResult =
    isOwnClubMinute && !isDistrictReadOnly
      ? await listMinuteComments(id)
      : { comments: [], canComment: false, canModerate: false };

  const canEditMinutes =
    isOwnClubMinute &&
    !isDistrictReadOnly &&
    !!ctx &&
    (await hasRolePermission(ctx.role, "minutes.edit", ctx.isSuperAdmin, ctx.customRoleId));
  const canEdit =
    canEditMinutes &&
    (!isMinuteContentLocked(minute.status) ||
      (!!ctx && canOverrideMinuteLock(ctx)));

  return (
    <AppShellServer title="Aperçu du procès-verbal">
      <div className="space-y-6">
        <MinutePreview
          locale={locale}
          backHref={
            isDistrictReadOnly ? `/${locale}/district/minutes` : `/${locale}/minutes`
          }
          pdfEnabled={pdfEnabled && !isDistrictReadOnly}
          pdfVisible={pdfVisible && !isDistrictReadOnly}
          emailsEnabled={emailsEnabled && !isDistrictReadOnly}
          emailsVisible={emailsVisible && !isDistrictReadOnly}
          memberEmailCount={memberEmailCount}
          canEdit={canEdit}
          data={{
            id: minute.id,
            title: minute.title,
            status: minute.status,
            contentHash: minute.contentHash,
            verifyUrl,
            qrCodeDataUrl,
            club: {
              id: minute.club.id,
              name: minute.club.name,
              address: minute.club.address,
              district: minute.club.district,
              country: minute.club.country,
              minuteShowMemberPhotos: minute.club.minuteShowMemberPhotos,
              logoUrl: resolveClubBrandLogoSrc({
                clubId: minute.club.id,
                clubName: minute.club.name,
                logoUrl: minute.club.logoUrl,
                baseUrl,
              }),
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

        {isOwnClubMinute && !isDistrictReadOnly && (
          <div className="max-w-3xl mx-auto w-full px-0 lg:px-0">
            <MinuteComments
              minuteId={minute.id}
              initialComments={commentsResult.comments ?? []}
              canComment={!!commentsResult.canComment}
              canModerate={!!commentsResult.canModerate}
            />
          </div>
        )}
      </div>
    </AppShellServer>
  );
}