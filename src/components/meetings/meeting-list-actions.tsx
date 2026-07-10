"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileText, Radio, UserCheck, Play } from "lucide-react";
import { startLiveMeeting } from "@/actions/meetings";
import { cn } from "@/lib/utils";

const actionClass =
  "inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-700";

export function MeetingListActions({
  meetingId,
  minuteId,
  locale,
  isLive,
  canStartLive,
  liveEnabled,
}: {
  meetingId: string;
  minuteId?: string | null;
  locale: string;
  isLive: boolean;
  /** True when meeting is today or upcoming (not past) and not already live */
  canStartLive: boolean;
  liveEnabled: boolean;
}) {
  const t = useTranslations("meetings");
  const [pending, startTransition] = useTransition();

  const attendanceHref = `/${locale}/meetings/${meetingId}/attendance`;
  const liveHref = `/${locale}/meetings/${meetingId}/live`;
  const minuteHref = minuteId ? `/${locale}/minutes/${minuteId}/edit` : null;

  function handleStartLive() {
    startTransition(() => {
      void startLiveMeeting(meetingId, locale);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Link href={attendanceHref} className={actionClass} title={t("actionAttendance")}>
        <UserCheck className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("actionAttendance")}</span>
      </Link>

      {liveEnabled && isLive && (
        <Link
          href={liveHref}
          className={cn(actionClass, "border-navy/30 text-navy bg-navy/5 hover:bg-navy/10")}
          title={t("live")}
        >
          <Radio className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("live")}</span>
        </Link>
      )}

      {liveEnabled && canStartLive && (
        <button
          type="button"
          onClick={handleStartLive}
          disabled={pending}
          className={cn(
            actionClass,
            "border-gold/50 text-navy-dark bg-gold/20 hover:bg-gold/30 font-semibold"
          )}
          title={t("startLive")}
        >
          <Play className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{pending ? "…" : t("startLive")}</span>
        </button>
      )}

      {minuteHref && (
        <Link href={minuteHref} className={actionClass} title={t("actionMinute")}>
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("actionMinute")}</span>
        </Link>
      )}
    </div>
  );
}
