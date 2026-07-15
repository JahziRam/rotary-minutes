import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FileText, Wallet, Users, Bell, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WebPushEnable } from "@/components/notifications/web-push-enable";
import type { MemberHubSummary } from "@/lib/queries/member-hub";

export async function MemberMobileHub({
  locale,
  summary,
  vapidPublicKey,
  webPushEnabled = true,
}: {
  locale: string;
  summary: MemberHubSummary;
  vapidPublicKey: string | null;
  webPushEnabled?: boolean;
}) {
  const t = await getTranslations("memberHub");

  const cards = [
    {
      key: "minutes",
      href: `/${locale}/minutes?status=FINALIZED`,
      icon: FileText,
      title: t("minutesTitle"),
      value: String(summary.finalizedMinutesCount),
      subtitle: t("minutesSubtitle"),
      accent: "bg-navy/10 text-navy",
    },
    {
      key: "dues",
      href: `/${locale}/my-account#dues`,
      icon: Wallet,
      title: t("duesTitle"),
      value:
        summary.duesOverdueCount > 0
          ? t("duesOverdue", { count: summary.duesOverdueCount })
          : summary.duesPendingCount > 0
            ? t("duesPending", { count: summary.duesPendingCount })
            : t("duesOk"),
      subtitle: t("duesSubtitle"),
      accent: "bg-gold/15 text-amber-900",
    },
    {
      key: "attendance",
      href: `/${locale}/my-account#attendance`,
      icon: Users,
      title: t("attendanceTitle"),
      value: `${summary.attendanceRate}%`,
      subtitle: t("attendanceSubtitle", {
        present: summary.attendancePresent,
        total: summary.attendanceTotal,
        goal: summary.attendanceGoal,
      }),
      accent: "bg-emerald-50 text-emerald-800",
    },
    {
      key: "notifications",
      href: `/${locale}/notifications`,
      icon: Bell,
      title: t("notificationsTitle"),
      value: t("notificationsValue"),
      subtitle: t("notificationsSubtitle"),
      accent: "bg-sky-50 text-sky-800",
    },
  ] as const;

  return (
    <section className="space-y-4 lg:hidden" aria-label={t("sectionTitle")}>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t("sectionTitle")}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t("sectionSubtitle")}</p>
      </div>

      {!summary.linked && (
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="p-4 text-sm text-amber-900">
            <p className="font-medium">{t("linkRequired")}</p>
            <Link
              href={`/${locale}/my-account`}
              className="inline-flex items-center gap-1 mt-2 text-navy font-medium hover:underline"
            >
              {t("linkCta")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link key={card.key} href={card.href} className="block">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center ${card.accent}`}
                >
                  <card.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-gray-500">{card.title}</p>
                <p className="text-lg font-semibold text-gray-900 leading-tight">{card.value}</p>
                <p className="text-[11px] text-gray-500 line-clamp-2">{card.subtitle}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {summary.recentFinalizedMinutes.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium text-gray-900">{t("recentMinutes")}</p>
            <ul className="space-y-1">
              {summary.recentFinalizedMinutes.map((pv) => (
                <li key={pv.id}>
                  <Link
                    href={`/${locale}/minutes/${pv.id}`}
                    className="text-sm text-navy hover:underline truncate block"
                  >
                    {pv.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <WebPushEnable
            vapidPublicKey={vapidPublicKey}
            preferenceEnabled={webPushEnabled}
          />
        </CardContent>
      </Card>
    </section>
  );
}