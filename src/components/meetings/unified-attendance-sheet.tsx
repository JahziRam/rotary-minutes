"use client";

import { useTranslations } from "next-intl";
import { MonitorSmartphone } from "lucide-react";
import { MobileAttendanceSheet } from "@/components/meetings/mobile-attendance-sheet";
import type { AttendanceEntry } from "@/actions/attendance";

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Unified attendance UI for desktop and mobile — same component and API everywhere.
 */
export function UnifiedAttendanceSheet({
  members,
  meetingId,
  minuteId,
  initialEntries = [],
}: {
  members: MemberOption[];
  meetingId: string;
  minuteId?: string | null;
  initialEntries?: AttendanceEntry[];
}) {
  const t = useTranslations("attendance");

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 flex items-center gap-1.5 px-1">
        <MonitorSmartphone className="h-3.5 w-3.5" />
        {t("unifiedNote")}
      </p>
      <MobileAttendanceSheet
        members={members}
        meetingId={meetingId}
        minuteId={minuteId}
        initialEntries={initialEntries}
      />
    </div>
  );
}