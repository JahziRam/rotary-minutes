"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { endLiveMeeting } from "@/actions/meetings";
import { cn } from "@/lib/utils";

export function EndMeetingButton({
  meetingId,
  variant = "banner",
  className,
}: {
  meetingId: string;
  /** banner = full CTA on live page; compact = list action chip */
  variant?: "banner" | "compact" | "button";
  className?: string;
}) {
  const t = useTranslations("meetings");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  function handleEnd() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("endLiveConfirm"))
    ) {
      return;
    }
    startTransition(() => {
      void endLiveMeeting(meetingId, locale);
    });
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleEnd}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 transition-colors",
          className
        )}
        title={t("endLive")}
      >
        <Square className="h-3.5 w-3.5 fill-current" />
        <span className="hidden sm:inline">{pending ? "…" : t("endLive")}</span>
      </button>
    );
  }

  if (variant === "button") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleEnd}
        disabled={pending}
        className={cn("border-red-200 text-red-800 hover:bg-red-50", className)}
      >
        <Square className="h-4 w-4 fill-current" />
        {pending ? "…" : t("endLive")}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-red-200 bg-red-50/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
        className
      )}
    >
      <div>
        <p className="font-medium text-sm text-gray-900">{t("endLiveTitle")}</p>
        <p className="text-xs text-gray-600 mt-0.5">{t("endLiveHint")}</p>
      </div>
      <Button
        type="button"
        onClick={handleEnd}
        disabled={pending}
        className="bg-red-700 hover:bg-red-800 text-white shrink-0"
      >
        <Square className="h-4 w-4 fill-current" />
        {pending ? t("endLiveEnding") : t("endLive")}
      </Button>
    </div>
  );
}
