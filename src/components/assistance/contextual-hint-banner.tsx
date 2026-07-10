"use client";

import { useTransition } from "react";
import { X, Lightbulb, BookOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { dismissContextualHint } from "@/actions/assistance";
import { CONTEXTUAL_HINTS, type ContextualHintId } from "@/lib/assistance/hints";
import { useAssistance } from "./assistance-context";

export function ContextualHintBanner({ hintId }: { hintId: ContextualHintId }) {
  const t = useTranslations("assistance.hints");
  const tCommon = useTranslations("assistance");
  const locale = useLocale();
  const assistance = useAssistance();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!assistance?.guideEnabled) return null;
  if (assistance.dismissedHints.includes(hintId)) return null;

  const def = CONTEXTUAL_HINTS[hintId];
  const helpHref = `/${locale}/help#${def.helpAnchor}`;

  function dismiss() {
    startTransition(async () => {
      await dismissContextualHint(hintId);
      router.refresh();
    });
  }

  return (
    <div
      role="note"
      className="rounded-xl border border-gold/30 bg-gold/5 p-4 flex gap-3"
      aria-label={t(`${hintId}.title`)}
    >
      <Lightbulb className="h-5 w-5 text-gold shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0 space-y-2">
        <p className="font-medium text-navy text-sm">{t(`${hintId}.title`)}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{t(`${hintId}.body`)}</p>
        <Link
          href={helpHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-navy hover:underline"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          {tCommon("learnMore")}
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        disabled={pending}
        className="text-gray-400 hover:text-gray-600 p-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded"
        aria-label={tCommon("dismissHint")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}