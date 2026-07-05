"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { differenceInCalendarDays, format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Clock } from "lucide-react";
import Link from "next/link";

export function TrialBanner({
  trialEndsAt,
  locale,
}: {
  trialEndsAt: string | Date;
  locale: string;
}) {
  const t = useTranslations("subscription");
  const dateLocale = locale === "fr" ? fr : enUS;

  const { daysLeft, endLabel, urgent } = useMemo(() => {
    const end = new Date(trialEndsAt);
    const days = differenceInCalendarDays(end, new Date());
    return {
      daysLeft: Math.max(0, days),
      endLabel: format(end, "d MMMM yyyy", { locale: dateLocale }),
      urgent: days <= 3,
    };
  }, [trialEndsAt, dateLocale]);

  return (
    <div
      className={
        urgent
          ? "bg-amber-50 border-b border-amber-200 text-amber-900"
          : "bg-navy/5 border-b border-navy/10 text-navy"
      }
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            {daysLeft === 0
              ? t("trialBanner.lastDay", { date: endLabel })
              : t("trialBanner.daysLeft", { count: daysLeft, date: endLabel })}
          </span>
        </div>
        <Link
          href={`/${locale}/settings/subscription`}
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          {t("trialBanner.upgrade")}
        </Link>
      </div>
    </div>
  );
}