import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Calendar, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function PublicClubMeetingsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("publicMeetings");
  const dateLocale = locale === "fr" ? fr : enUS;

  const club = await prisma.club.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      city: true,
      meetingLocation: true,
    },
  });
  if (!club) notFound();

  const meetings = await prisma.meeting.findMany({
    where: { clubId: club.id, date: { gte: new Date() } },
    orderBy: { date: "asc" },
    take: 30,
    select: {
      id: true,
      title: true,
      date: true,
      location: true,
      startTime: true,
      type: true,
    },
  });

  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">{club.city}</p>
          <h1 className="text-2xl font-bold text-navy">{club.name}</h1>
          <p className="text-gray-600">{t("subtitle")}</p>
        </div>

        <div className="space-y-3">
          {meetings.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 text-sm">
              {t("empty")}
            </div>
          ) : (
            meetings.map((meeting) => (
              <article
                key={meeting.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <h2 className="font-semibold text-gray-900">
                  {meeting.title ?? t("defaultTitle")}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-navy" />
                    {format(meeting.date, "EEEE d MMMM yyyy", { locale: dateLocale })}
                    {meeting.startTime ? ` · ${meeting.startTime}` : ""}
                  </span>
                  {(meeting.location || club.meetingLocation) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-navy" />
                      {meeting.location ?? club.meetingLocation}
                    </span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          <Link href={`/${locale}`} className="hover:text-navy hover:underline">
            {t("poweredBy")}
          </Link>
        </p>
      </div>
    </div>
  );
}