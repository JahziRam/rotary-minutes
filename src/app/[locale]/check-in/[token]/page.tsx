import { getTranslations, setRequestLocale } from "next-intl/server";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { getCheckInMeeting } from "@/actions/check-in";
import { CheckInForm } from "@/components/meetings/check-in-form";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("attendance");
  const data = await getCheckInMeeting(token);
  const dateLocale = locale === "fr" ? fr : enUS;
  const isFr = locale === "fr";

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <h1 className="text-lg font-semibold text-gray-900">
            {isFr ? "Lien expiré ou invalide" : "Link expired or invalid"}
          </h1>
          <p className="text-sm text-gray-500">
            {isFr ? "Contactez le secrétaire du club." : "Contact your club secretary."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6 py-8">
        <div className="text-center">
          <p className="text-sm text-gray-500">{data.meeting.club.name}</p>
          <h1 className="text-xl font-bold text-navy mt-1">{t("checkInTitle")}</h1>
          <p className="text-sm text-gray-600 mt-2">
            {format(data.meeting.date, "EEEE d MMMM yyyy", { locale: dateLocale })}
          </p>
        </div>
        <CheckInForm
          token={token}
          meetingId={data.meeting.id}
          members={data.members}
          locale={locale}
        />
      </div>
    </div>
  );
}