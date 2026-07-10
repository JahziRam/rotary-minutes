"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Calendar,
  FileText,
  Users,
  Wallet,
  Mail,
  ArrowRight,
  BookOpen,
  CalendarDays,
  PartyPopper,
  Settings,
  ClipboardList,
  UserCircle,
  Coins,
} from "lucide-react";
import type { EmptyStateKey } from "@/lib/assistance/hints";
import { EMPTY_STATE_HELP } from "@/lib/assistance/hints";

const ICONS: Record<EmptyStateKey, typeof Calendar> = {
  meetings: Calendar,
  minutes: FileText,
  members: Users,
  treasury: Wallet,
  emails: Mail,
  calendar: CalendarDays,
  events: PartyPopper,
  settings: Settings,
  attendance: ClipboardList,
  profile: UserCircle,
  dues: Coins,
  dashboard_meetings: Calendar,
  dashboard_minutes: FileText,
  live_no_minute: FileText,
};

export function GuidedEmptyStateClient({
  stateKey,
  primaryHref,
  secondaryHref,
}: {
  stateKey: EmptyStateKey;
  primaryHref?: string;
  secondaryHref?: string;
}) {
  const t = useTranslations(`assistance.emptyStates.${stateKey}`);
  const tCommon = useTranslations("assistance");
  const locale = useLocale();
  const Icon = ICONS[stateKey];
  const helpAnchor = EMPTY_STATE_HELP[stateKey];
  const primary = primaryHref ?? t("primaryHref");
  const hasSecondary = ["members", "minutes"].includes(stateKey);
  const secondary = hasSecondary ? (secondaryHref ?? t("secondaryHref")) : secondaryHref;
  const secondaryLabel = hasSecondary ? t("secondaryLabel") : undefined;

  return (
    <div className="rounded-2xl border border-dashed border-navy/20 bg-gradient-to-br from-navy/5 to-gold/5 p-8 sm:p-10 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-navy/10 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-navy" aria-hidden />
      </div>
      <h3 className="font-display text-lg font-bold text-navy mb-2">{t("title")}</h3>
      <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed mb-6">{t("description")}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href={`/${locale}${primary}`}
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        >
          {t("primaryLabel")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        {secondary && secondaryLabel && (
          <Link
            href={`/${locale}${secondary}`}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50"
          >
            {secondaryLabel}
          </Link>
        )}
        <Link
          href={`/${locale}/help#${helpAnchor}`}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-medium text-navy hover:bg-navy/5"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          {tCommon("learnMore")}
        </Link>
      </div>
    </div>
  );
}