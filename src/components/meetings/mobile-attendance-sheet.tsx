"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { FileText, Save, UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { saveMeetingAttendance, type AttendanceEntry } from "@/actions/attendance";
import { formatPersonName } from "@/lib/format-person-name";
import { isAttendancePresent } from "@/lib/rotary";
import { cn } from "@/lib/utils";

const MEMBER_CATEGORIES = [
  "PRESENT",
  "EXCUSED_ABSENT",
  "UNEXCUSED_ABSENT",
  "TRAVELING",
  "TRAVEL_RETURN",
] as const;

const GUEST_CATEGORIES = [
  "ROTARY_GUEST",
  "ROTARACT_GUEST",
  "NON_ROTARY_GUEST",
  "SPEAKER",
  "VISITOR",
] as const;

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface GuestRow {
  id: string;
  name: string;
  category: string;
}

export function MobileAttendanceSheet({
  members,
  meetingId,
  minuteId,
  initialEntries = [],
}: {
  members: MemberOption[];
  meetingId: string;
  /** Linked minute for "start PV notes" after save */
  minuteId?: string | null;
  initialEntries?: AttendanceEntry[];
}) {
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const e of initialEntries) {
      if (e.memberId) map[e.memberId] = e.category;
    }
    return map;
  });
  const [guests, setGuests] = useState<GuestRow[]>(() =>
    initialEntries
      .filter((e) => e.guestName)
      .map((e, i) => ({
        id: `g-${i}`,
        name: e.guestName!,
        category: e.category,
      }))
  );
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialEntries.length > 0);

  const categoryLabels: Record<string, string> = {
    PRESENT: t("present"),
    EXCUSED_ABSENT: t("excusedAbsent"),
    UNEXCUSED_ABSENT: t("unexcusedAbsent"),
    TRAVELING: t("traveling"),
    TRAVEL_RETURN: t("travelReturn"),
    ROTARY_GUEST: t("rotaryGuest"),
    ROTARACT_GUEST: t("rotaractGuest"),
    NON_ROTARY_GUEST: t("nonRotaryGuest"),
    SPEAKER: t("speaker"),
    VISITOR: t("visitor"),
  };

  const present = Object.values(selected).filter((c) => isAttendancePresent(c)).length;
  const marked = Object.keys(selected).length;
  const minuteHref = minuteId
    ? `/${locale}/minutes/${minuteId}/edit`
    : `/${locale}/meetings/${meetingId}/live`;

  function handleSave() {
    const attendances: AttendanceEntry[] = [
      ...Object.entries(selected).map(([memberId, category]) => ({
        memberId,
        category,
      })),
      ...guests.filter((g) => g.name.trim()).map((g) => ({
        guestName: g.name.trim(),
        category: g.category,
      })),
    ];
    startTransition(async () => {
      const result = await saveMeetingAttendance(meetingId, attendances);
      if (result.success) {
        setSaved(true);
        setToast(tCommon("save") + " ✓");
      }
    });
  }

  function markAllPresent() {
    const all: Record<string, string> = {};
    for (const m of members) all[m.id] = "PRESENT";
    setSelected(all);
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto md:max-w-2xl">
      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 text-sm">
          <span className="font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
            {present} {t("present").toLowerCase()}
          </span>
          <span className="text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
            {marked}/{members.length}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={markAllPresent} disabled={pending}>
            <UserCheck className="h-4 w-4" />
            {t("markAllPresent")}
          </Button>
          <Button variant="gold" size="sm" onClick={handleSave} disabled={pending}>
            <Save className="h-4 w-4" />
            {tCommon("save")}
          </Button>
        </div>
      </div>

      {saved && (
        <div className="rounded-xl border border-navy/20 bg-navy/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-medium text-sm text-gray-900">{t("startMinuteTitle")}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t("startMinuteHint")}</p>
          </div>
          <Link
            href={minuteHref}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light transition-colors shrink-0"
          >
            <FileText className="h-4 w-4" />
            {t("startMinute")}
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
          >
            <p className="font-medium text-gray-900 text-sm mb-2">
              {formatPersonName(member.firstName, member.lastName)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MEMBER_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelected((prev) => ({ ...prev, [member.id]: cat }))}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px]",
                    selected[member.id] === cat
                      ? isAttendancePresent(cat)
                        ? "bg-green-100 text-green-800 ring-1 ring-green-300"
                        : "bg-navy/10 text-navy ring-1 ring-navy/20"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  )}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">{t("guests")}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setGuests((g) => [
                ...g,
                { id: Date.now().toString(), name: "", category: "VISITOR" },
              ])
            }
          >
            <UserPlus className="h-4 w-4" />
            {t("addGuest")}
          </Button>
        </div>
        {guests.map((guest, idx) => (
          <div key={guest.id} className="flex flex-col sm:flex-row gap-2">
            <Input
              value={guest.name}
              onChange={(e) =>
                setGuests((rows) =>
                  rows.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r))
                )
              }
              placeholder={t("guestName")}
            />
            <select
              value={guest.category}
              onChange={(e) =>
                setGuests((rows) =>
                  rows.map((r, i) => (i === idx ? { ...r, category: e.target.value } : r))
                )
              }
              className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
            >
              {GUEST_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat]}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
