"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Construction, ArrowRight } from "lucide-react";

/** Shown to non-admin members while club setup wizard is still incomplete. */
export function ClubSetupPendingBanner({ clubName }: { clubName: string }) {
  const t = useTranslations("onboarding.setupPending");
  const locale = useLocale();

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Construction className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-amber-950">
            {t("title", { club: clubName })}
          </p>
          <p className="text-xs text-amber-900/80 mt-0.5">{t("body")}</p>
        </div>
      </div>
      <Link
        href={`/${locale}/help#getting-started`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline shrink-0"
      >
        {t("help")}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
