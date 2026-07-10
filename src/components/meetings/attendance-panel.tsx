"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { computeLiveAttendanceRate, isAttendancePresent } from "@/lib/rotary";
import { saveMeetingAttendance } from "@/actions/attendance";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "PRESENT",
  "EXCUSED_ABSENT",
  "UNEXCUSED_ABSENT",
  "TRAVELING",
  "TRAVEL_RETURN",
] as const;

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

export function AttendancePanel({
  members,
  meetingId,
  initialSelected = {},
}: {
  members: MemberOption[];
  meetingId: string;
  initialSelected?: Record<string, string>;
}) {
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const [selected, setSelected] = useState<Record<string, string>>(initialSelected);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const present = Object.values(selected).filter((c) => isAttendancePresent(c)).length;
  const marked = Object.keys(selected).length;
  const rate = computeLiveAttendanceRate(present, members.length);

  const categoryLabels: Record<string, string> = {
    PRESENT: t("present"),
    EXCUSED_ABSENT: t("excusedAbsent"),
    UNEXCUSED_ABSENT: t("unexcusedAbsent"),
    TRAVELING: t("traveling"),
    TRAVEL_RETURN: t("travelReturn"),
  };

  function handleSave() {
    const attendances = Object.entries(selected).map(([memberId, category]) => ({
      memberId,
      category,
    }));
    startTransition(async () => {
      const result = await saveMeetingAttendance(meetingId, attendances);
      if (result.success) setToast("Présences enregistrées");
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
              {present} {t("present").toLowerCase()}
            </span>
            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
              {marked}/{members.length}
            </span>
            <span className="text-sm font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full">
              {rate}% {t("rate")}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={pending}>
            <Save className="h-4 w-4" />
            {tCommon("save")}
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>{t("title")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 gap-2">
                <span className="text-sm font-medium shrink-0">
                  {member.firstName} {member.lastName}
                </span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelected((prev) => ({ ...prev, [member.id]: cat }))}
                      className={cn(
                        "px-2 py-1 rounded text-xs transition-colors",
                        selected[member.id] === cat
                          ? isAttendancePresent(cat)
                            ? "bg-green-100 text-green-800"
                            : "bg-navy/10 text-navy"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                    >
                      {categoryLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}