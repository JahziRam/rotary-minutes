"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  FileText,
  UserCircle,
  Bell,
  X,
  Sparkles,
} from "lucide-react";
import { dismissContextualHint } from "@/actions/assistance";
import { Button } from "@/components/ui/button";

const HINT_ID = "member_welcome_v1";

export function MemberWelcomeCard({
  firstName,
  clubName,
  linkedMember,
  showDues = true,
}: {
  firstName?: string | null;
  clubName: string;
  linkedMember: boolean;
  showDues?: boolean;
}) {
  const t = useTranslations("onboarding.memberWelcome");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  function dismiss() {
    startTransition(async () => {
      await dismissContextualHint(HINT_ID);
      setHidden(true);
      router.refresh();
    });
  }

  const links = [
    {
      href: `/${locale}/minutes?status=FINALIZED`,
      icon: FileText,
      title: t("links.minutes"),
      desc: t("links.minutesDesc"),
    },
    {
      href: `/${locale}/calendar`,
      icon: Calendar,
      title: t("links.calendar"),
      desc: t("links.calendarDesc"),
    },
    {
      href: `/${locale}/my-account`,
      icon: UserCircle,
      title: linkedMember ? t("links.account") : t("links.linkProfile"),
      desc: linkedMember ? t("links.accountDesc") : t("links.linkProfileDesc"),
    },
    {
      href: `/${locale}/notifications`,
      icon: Bell,
      title: t("links.notifications"),
      desc: t("links.notificationsDesc"),
    },
  ];

  return (
    <section
      aria-labelledby="member-welcome-title"
      className="rounded-2xl border border-navy/15 bg-gradient-to-br from-white via-white to-navy/5 p-5 sm:p-6 space-y-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-navy flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-gold" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2
              id="member-welcome-title"
              className="font-display font-bold text-navy text-lg"
            >
              {firstName
                ? t("titleNamed", { name: firstName })
                : t("title")}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t("subtitle", { club: clubName })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="text-gray-400 hover:text-gray-600 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
          aria-label={t("dismiss")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!linkedMember && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          <p className="font-medium">{t("linkBannerTitle")}</p>
          <p className="text-xs mt-0.5 text-amber-900/80">{t("linkBannerBody")}</p>
          <Link
            href={`/${locale}/my-account`}
            className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-navy hover:underline"
          >
            {t("links.linkProfile")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <ul className="grid sm:grid-cols-2 gap-2">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-gold/50 hover:bg-gold/5 transition-colors h-full"
            >
              <div className="h-9 w-9 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
                <item.icon className="h-4 w-4 text-navy" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {showDues && linkedMember && (
        <p className="text-xs text-gray-500">
          {t("duesHint")}{" "}
          <Link
            href={`/${locale}/my-account#dues`}
            className="text-navy font-medium hover:underline"
          >
            {t("duesLink")}
          </Link>
        </p>
      )}

      <div className="flex justify-end">
        <Button size="sm" variant="outline" disabled={pending} onClick={dismiss}>
          {t("gotIt")}
        </Button>
      </div>
    </section>
  );
}
