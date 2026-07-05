"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Building2,
  Users,
  Calendar,
  FileText,
  Lock,
  Clock,
} from "lucide-react";
import { initDemoSession } from "@/actions/demo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMinuteStatusLabel, getMinuteStatusVariant } from "@/lib/minute-status";

type DemoClub = NonNullable<Awaited<ReturnType<typeof import("@/lib/queries/demo").getDemoClubData>>>;

export function DemoView({
  locale,
  club,
}: {
  locale: string;
  club: DemoClub | null;
}) {
  const t = useTranslations("demo");
  const tRoot = useTranslations();
  const dateLocale = locale === "fr" ? fr : enUS;
  const [sessionReady, setSessionReady] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    initDemoSession().then((s) => {
      setExpiresAt(s.expiresAt);
      setSessionReady(true);
    });
  }, []);

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <p className="text-gray-600 mb-4">{t("unavailable")}</p>
        <Link
          href={`/${locale}`}
          className="text-navy font-medium hover:underline"
        >
          {t("backHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-navy-dark text-white">
        <div className="h-1 bg-gold" />
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <span className="font-display text-xl font-bold">Rotary Minutes</span>
            <p className="text-xs text-white/60 mt-0.5">{t("sandbox")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="gold" className="hidden sm:inline-flex gap-1">
              <Lock className="h-3 w-3" />
              {t("readOnly")}
            </Badge>
            <Link
              href={`/${locale}/register`}
              className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs font-semibold bg-gold text-navy-dark hover:bg-gold-light shadow-sm transition-all"
            >
              {t("startTrial")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{club.name}</h1>
            <p className="text-gray-500 mt-1">
              {club.city}, {club.country}
              {club.district ? ` · District ${club.district}` : ""}
            </p>
          </div>
          {expiresAt && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t("expires", {
                date: format(new Date(expiresAt), "Pp", { locale: dateLocale }),
              })}
            </p>
          )}
        </div>

        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {t("notice")}
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <Users className="h-8 w-8 text-navy/70" />
              <div>
                <p className="text-2xl font-bold">{club._count.members}</p>
                <p className="text-sm text-gray-500">{t("members")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-navy/70" />
              <div>
                <p className="text-2xl font-bold">{club._count.meetings}</p>
                <p className="text-sm text-gray-500">{t("meetings")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <FileText className="h-8 w-8 text-navy/70" />
              <div>
                <p className="text-2xl font-bold">{club._count.minutes}</p>
                <p className="text-sm text-gray-500">{t("minutes")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("memberList")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {club.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0"
                  >
                    <span className="font-medium text-gray-900">
                      {m.firstName} {m.lastName}
                    </span>
                    <span className="text-gray-500">{m.position ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("recentMinutes")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {club.minutes.map((pv) => (
                  <li key={pv.id} className="text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-900 line-clamp-2">
                        {pv.title}
                      </p>
                      <Badge variant={getMinuteStatusVariant(pv.status)} className="shrink-0">
                        {getMinuteStatusLabel(pv.status, (key) => tRoot(key))}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(pv.meeting.date), "PPP", { locale: dateLocale })}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t("clubInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">{t("president")}</p>
              <p className="font-medium">{club.presidentName ?? "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">{t("secretary")}</p>
              <p className="font-medium">{club.secretaryName ?? "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">{t("meetingDay")}</p>
              <p className="font-medium">
                {club.meetingDay ?? "—"} {club.meetingTime ?? ""}
              </p>
            </div>
            <div>
              <p className="text-gray-500">{t("location")}</p>
              <p className="font-medium">{club.meetingLocation ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-navy-dark text-white/50 text-sm py-6 text-center">
        <Link href={`/${locale}`} className="hover:text-white transition-colors">
          ← {t("backHome")}
        </Link>
      </footer>
    </div>
  );
}