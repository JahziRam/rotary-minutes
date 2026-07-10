"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, X } from "lucide-react";
import { dismissContextualHint } from "@/actions/assistance";
import { useAssistance } from "./assistance-context";

export function CoachBanner() {
  const t = useTranslations("assistance.coach");
  const tCommon = useTranslations("assistance");
  const locale = useLocale();
  const assistance = useAssistance();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!assistance?.guideEnabled || !assistance.coachTip) return null;

  const hintId = `coach_${assistance.coachTip.key}`;
  if (assistance.dismissedHints.includes(hintId)) return null;

  function dismiss() {
    startTransition(async () => {
      await dismissContextualHint(hintId);
      router.refresh();
    });
  }

  return (
    <div
      role="status"
      className="rounded-xl border border-navy/15 bg-navy/5 px-4 py-3 flex items-start gap-3"
    >
      <Sparkles className="h-5 w-5 text-gold shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
          {t("weekLabel", { week: assistance.coachTip.week })}
        </p>
        <p className="text-sm text-navy font-medium mt-0.5">
          {t(`tips.${assistance.coachTip.key}.title`)}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          {t(`tips.${assistance.coachTip.key}.body`)}
        </p>
        <Link
          href={`/${locale}/help#getting-started`}
          className="text-xs text-navy hover:underline mt-2 inline-block"
        >
          {tCommon("learnMore")}
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        disabled={pending}
        className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
        aria-label={tCommon("dismissHint")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}