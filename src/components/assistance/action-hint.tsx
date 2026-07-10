"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MousePointerClick, X } from "lucide-react";
import { dismissContextualHint } from "@/actions/assistance";
import { CONTEXTUAL_HINTS, type ContextualHintId } from "@/lib/assistance/hints";
import { ASSISTANCE_EVENT_TYPES } from "@/lib/assistance/analytics";
import { trackAssistanceEvent } from "@/actions/assistance-analytics";
import { useAssistance } from "./assistance-context";

export function ActionHint({
  hintId,
  when = true,
}: {
  hintId: ContextualHintId;
  when?: boolean;
}) {
  const t = useTranslations("assistance.hints");
  const tCommon = useTranslations("assistance");
  const assistance = useAssistance();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const def = CONTEXTUAL_HINTS[hintId];
  const visible =
    when &&
    assistance?.guideEnabled &&
    def.variant === "action" &&
    !assistance.dismissedHints.includes(hintId);

  useEffect(() => {
    if (!visible) return;
    void trackAssistanceEvent(ASSISTANCE_EVENT_TYPES.HINT_VIEW, { hintId });
  }, [visible, hintId]);

  if (!visible) return null;

  function dismiss() {
    startTransition(async () => {
      await dismissContextualHint(hintId);
      router.refresh();
    });
  }

  return (
    <div
      role="note"
      className="absolute -top-2 left-0 right-0 z-20 flex justify-center pointer-events-none"
      aria-label={t(`${hintId}.title`)}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-gold bg-gold text-navy-dark px-3 py-1.5 text-xs font-semibold shadow-lg animate-bounce max-w-full">
        <MousePointerClick className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{t(`${hintId}.action`)}</span>
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="p-0.5 hover:opacity-70 shrink-0"
          aria-label={tCommon("dismissHint")}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}