"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Home,
  FileText,
  Users,
  Mail,
  Calendar,
  BarChart3,
  Settings,
  Lock,
  ArrowLeft,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MinutePreview } from "@/components/minutes/minute-preview";
import { getDemoMinutePreview } from "@/lib/demo-minute-preview";
import {
  DEMO_CLUB,
  DEMO_MEMBERS,
  DEMO_MINUTES,
  DEMO_STATS,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type DemoTab = "dashboard" | "minutes" | "members" | "emails";

const NAV = [
  { id: "dashboard" as const, icon: Home, labelKey: "dashboard" },
  { id: "minutes" as const, icon: FileText, labelKey: "minutes" },
  { id: "members" as const, icon: Users, labelKey: "members" },
  { id: "emails" as const, icon: Mail, labelKey: "emails" },
];

export function DemoApp({ locale }: { locale: string }) {
  const t = useTranslations("demo");
  const tNav = useTranslations("nav");
  const dateLocale = locale === "fr" ? fr : enUS;
  const [tab, setTab] = useState<DemoTab>("dashboard");
  const [minutePreview, setMinutePreview] = useState(false);

  const clubName = DEMO_CLUB.name;

  if (minutePreview) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="lg:pl-[var(--sidebar-w)]">
          <div className="border-b bg-white px-4 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMinutePreview(false)}
              className="inline-flex items-center gap-2 text-sm font-medium text-navy"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToDemo")}
            </button>
            <Badge variant="gold" className="gap-1">
              <Lock className="h-3 w-3" />
              {t("readOnly")}
            </Badge>
          </div>
          <MinutePreview
            data={getDemoMinutePreview(locale)}
            locale={locale}
            backHref="#"
            pdfEnabled={false}
            emailsEnabled={false}
            hideBackLink
          />
        </div>
        <DemoSidebar
          clubName={clubName}
          tab={tab}
          onTab={setTab}
          locale={locale}
          tNav={tNav}
        />
        <DemoMobileNav tab={tab} onTab={setTab} tNav={tNav} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DemoSidebar
        clubName={clubName}
        tab={tab}
        onTab={setTab}
        locale={locale}
        tNav={tNav}
      />

      <div className="lg:pl-[var(--sidebar-w)]">
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate lg:text-xl">
              {tNav(NAV.find((n) => n.id === tab)!.labelKey)}
            </h1>
            <p className="text-xs text-gray-500 truncate lg:hidden">{clubName}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="gold" className="hidden sm:inline-flex gap-1">
              <Lock className="h-3 w-3" />
              {t("readOnly")}
            </Badge>
            <Link
              href={`/${locale}/register`}
              className="inline-flex h-9 items-center rounded-lg bg-gold px-3 text-xs font-semibold text-navy-dark hover:bg-gold-light sm:px-4 sm:text-sm"
            >
              {t("startTrial")}
            </Link>
          </div>
        </header>

        <main className="p-4 pb-[calc(var(--bottom-nav-h)+1rem)] lg:p-6 lg:pb-6 max-w-7xl mx-auto space-y-4">
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            {t("interactiveNotice")}
          </p>

          {tab === "dashboard" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: t("members"), value: DEMO_CLUB.memberCount, icon: Users },
                  { label: t("meetings"), value: DEMO_STATS.meetingsCount, icon: Calendar },
                  { label: t("minutes"), value: DEMO_MINUTES.length, icon: FileText },
                  { label: locale === "fr" ? "Assiduité" : "Attendance", value: `${DEMO_STATS.annualAttendance}%`, icon: BarChart3 },
                ].map(({ label, value, icon: Icon }) => (
                  <Card key={label}>
                    <CardContent className="pt-4 flex items-center gap-3">
                      <Icon className="h-7 w-7 text-navy/60 shrink-0" />
                      <div>
                        <p className="text-xl font-bold">{value}</p>
                        <p className="text-xs text-gray-500">{label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("recentMinutes")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {DEMO_MINUTES.map((pv) => (
                    <button
                      key={pv.id}
                      type="button"
                      onClick={() => setMinutePreview(true)}
                      className="w-full flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{pv.title}</p>
                        <p className="text-xs text-gray-500">
                          {format(pv.date, "PPP", { locale: dateLocale })}
                        </p>
                      </div>
                      <Eye className="h-4 w-4 text-navy shrink-0" />
                    </button>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {tab === "minutes" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("minutesList")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {DEMO_MINUTES.map((pv) => (
                  <div
                    key={pv.id}
                    className="rounded-xl border border-gray-200 p-4 hover:border-gold/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{pv.title}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {format(pv.date, "PPP", { locale: dateLocale })} · {pv.author}
                        </p>
                      </div>
                      <Badge variant={pv.status === "FINALIZED" ? "success" : "warning"}>
                        {pv.status === "FINALIZED"
                          ? locale === "fr" ? "Finalisé" : "Finalized"
                          : locale === "fr" ? "Brouillon" : "Draft"}
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMinutePreview(true)}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-navy hover:underline"
                    >
                      <Eye className="h-4 w-4" />
                      {t("previewMinute")}
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {tab === "members" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("memberList")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-gray-100">
                  {DEMO_MEMBERS.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-3">
                      <div className="h-10 w-10 rounded-full bg-navy/10 flex items-center justify-center text-sm font-semibold text-navy shrink-0">
                        {m.firstName[0]}{m.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{m.firstName} {m.lastName}</p>
                        <p className="text-sm text-gray-500">{m.position}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {tab === "emails" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("emailPreview")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-navy/5 px-4 py-3 border-b text-sm">
                    <p className="font-medium text-gray-900">
                      {locale === "fr" ? "Rappel de réunion" : "Meeting reminder"}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {locale === "fr" ? "À : membres@club-paris.fr" : "To: members@club-paris.fr"}
                    </p>
                  </div>
                  <div className="p-4 text-sm text-gray-700 space-y-3 bg-white">
                    <div className="flex items-center gap-3 pb-3 border-b">
                      <div className="h-10 w-10 rounded-full bg-navy flex items-center justify-center text-gold text-xs font-bold">
                        RC
                      </div>
                      <span className="font-semibold">{clubName}</span>
                    </div>
                    <p>
                      {locale === "fr"
                        ? "Bonjour, vous êtes convié(e) à la prochaine réunion statutaire du mardi 4 mars 2026 à 12h30 — Hôtel Lutetia."
                        : "Hello, you are invited to the next statutory meeting on Tuesday, March 4, 2026 at 12:30 PM — Hôtel Lutetia."}
                    </p>
                    <p className="text-xs text-gray-400">{clubName} · Rotary Minutes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <DemoMobileNav tab={tab} onTab={setTab} tNav={tNav} />
    </div>
  );
}

function DemoSidebar({
  clubName,
  tab,
  onTab,
  locale,
  tNav,
}: {
  clubName: string;
  tab: DemoTab;
  onTab: (t: DemoTab) => void;
  locale: string;
  tNav: ReturnType<typeof useTranslations>;
}) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[var(--sidebar-w)] lg:fixed lg:inset-y-0 bg-navy-dark text-white">
      <div className="h-1 bg-gold" />
      <div className="p-5 border-b border-white/10">
        <Link href={`/${locale}`} className="block">
          <h1 className="font-display text-xl font-bold">Rotary Minutes</h1>
          <p className="text-xs text-white/60 mt-1 truncate">{clubName}</p>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              tab === id ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {tNav(labelKey)}
          </button>
        ))}
        <div className="pt-2 border-t border-white/10 mt-2">
          <span className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/30 cursor-not-allowed">
            <Settings className="h-4 w-4" />
            {tNav("settings")}
          </span>
        </div>
      </nav>
    </aside>
  );
}

function DemoMobileNav({
  tab,
  onTab,
  tNav,
}: {
  tab: DemoTab;
  onTab: (t: DemoTab) => void;
  tNav: ReturnType<typeof useTranslations>;
}) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 safe-bottom">
      <div className="grid grid-cols-4 h-[var(--bottom-nav-h)]">
        {NAV.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              tab === id ? "text-navy" : "text-gray-400"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate max-w-full px-1">{tNav(labelKey)}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}