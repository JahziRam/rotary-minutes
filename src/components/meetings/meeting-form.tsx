"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEETING_TYPE_FIELDS } from "@/lib/rotary";
import { createMeeting } from "@/actions/meetings";

const MEETING_TYPES = [
  "STATUTORY",
  "COMMITTEE",
  "COMMISSION",
  "GENERAL_ASSEMBLY",
  "JOINT_MEETING",
  "GOVERNOR_VISIT",
  "TRAINING",
  "SPECIAL",
] as const;

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface ClubDefaults {
  meetingLocation?: string | null;
  meetingTime?: string | null;
  presidentName?: string | null;
  secretaryName?: string | null;
}

export function MeetingForm({
  clubDefaults,
  members,
  lastMeeting,
  fromLast = false,
}: {
  clubDefaults: ClubDefaults;
  members: MemberOption[];
  lastMeeting?: {
    location?: string | null;
    presidedBy?: string | null;
    secretary?: string | null;
    startTime?: string | null;
  } | null;
  fromLast?: boolean;
}) {
  const t = useTranslations("meetings");
  const locale = useLocale();
  const [type, setType] = useState<string>("STATUTORY");
  const [pending, startTransition] = useTransition();

  const extraFields = MEETING_TYPE_FIELDS[type] ?? [];

  const defaults = {
    location: fromLast
      ? (lastMeeting?.location ?? clubDefaults.meetingLocation ?? "")
      : (clubDefaults.meetingLocation ?? ""),
    presidedBy: fromLast
      ? (lastMeeting?.presidedBy ?? clubDefaults.presidentName ?? "")
      : (clubDefaults.presidentName ?? ""),
    secretary: fromLast
      ? (lastMeeting?.secretary ?? clubDefaults.secretaryName ?? "")
      : (clubDefaults.secretaryName ?? ""),
    startTime: fromLast
      ? (lastMeeting?.startTime ?? clubDefaults.meetingTime ?? "")
      : (clubDefaults.meetingTime ?? ""),
  };

  return (
    <form
      action={(formData) => {
        const data = Object.fromEntries(formData.entries()) as Record<string, string>;
        data.type = type;
        startTransition(() => { void createMeeting(data, locale); });
      }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div data-assist="meeting-form-date">
              <Input
                name="date"
                type="date"
                label={t("date")}
                defaultValue={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="space-y-1.5" data-assist="meeting-form-type">
              <label className="text-sm font-medium text-gray-700">{t("type")}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                {MEETING_TYPES.map((mt) => (
                  <option key={mt} value={mt}>{t(`types.${mt}`)}</option>
                ))}
              </select>
            </div>
          </div>

          <div data-assist="meeting-form-location">
            <Input name="location" label={t("location")} defaultValue={defaults.location} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input name="startTime" type="time" label={t("startTime")} defaultValue={defaults.startTime} />
            <Input name="endTime" type="time" label={t("endTime")} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t("presidedBy")}</label>
              <select
                name="presidedBy"
                defaultValue={defaults.presidedBy}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                {members.map((m) => (
                  <option key={m.id} value={`${m.firstName} ${m.lastName}`}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t("secretary")}</label>
              <select
                name="secretary"
                defaultValue={defaults.secretary}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                {members.map((m) => (
                  <option key={m.id} value={`${m.firstName} ${m.lastName}`}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {extraFields.map((field) => (
            <Input key={field} name={field} label={t(field as "commissionName")} />
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3" data-assist="meeting-form-submit">
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? "..." : t("new")}
        </Button>
      </div>
    </form>
  );
}