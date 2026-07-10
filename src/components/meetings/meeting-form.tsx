"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEETING_TYPE_FIELDS } from "@/lib/rotary";
import { createMeeting, fetchAgendaTemplate } from "@/actions/meetings";

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

export type MeetingAgendaDraft = {
  id: string;
  title: string;
  description: string;
};

function newAgendaId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `agenda-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toDraftItems(
  items: Array<{ title: string; description?: string | null }>
): MeetingAgendaDraft[] {
  return items.map((item) => ({
    id: newAgendaId(),
    title: item.title,
    description: item.description ?? "",
  }));
}

export function MeetingForm({
  clubDefaults,
  members,
  lastMeeting,
  fromLast = false,
  initialAgenda = [],
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
  /** Agenda template for the default meeting type (STATUTORY) */
  initialAgenda?: Array<{ title: string; description?: string | null }>;
}) {
  const t = useTranslations("meetings");
  const tMinutes = useTranslations("minutes");
  const locale = useLocale();
  const [type, setType] = useState<string>("STATUTORY");
  const [mode, setMode] = useState<"now" | "scheduled">("scheduled");
  const [agendaItems, setAgendaItems] = useState<MeetingAgendaDraft[]>(() =>
    toDraftItems(initialAgenda)
  );
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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

  const agendaRequestId = useRef(0);
  const skipInitialFetch = useRef(initialAgenda.length > 0);

  const loadAgendaForType = useCallback(
    async (meetingType: string) => {
      const requestId = ++agendaRequestId.current;
      setAgendaLoading(true);
      try {
        const result = await fetchAgendaTemplate(meetingType, locale);
        if (requestId !== agendaRequestId.current) return;
        if (!result.error) {
          setAgendaItems(toDraftItems(result.items));
        }
      } finally {
        if (requestId === agendaRequestId.current) {
          setAgendaLoading(false);
        }
      }
    },
    [locale]
  );

  useEffect(() => {
    // Server already provided STATUTORY template — avoid a redundant first fetch.
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    void loadAgendaForType(type);
  }, [type, loadAgendaForType]);

  function updateAgendaItem(id: string, field: "title" | "description", value: string) {
    setAgendaItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function addAgendaItem() {
    setAgendaItems((prev) => [
      ...prev,
      { id: newAgendaId(), title: "", description: "" },
    ]);
  }

  function removeAgendaItem(id: string) {
    setAgendaItems((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)));
  }

  function mapCreateError(code: string | undefined): string {
    switch (code) {
      case "UNAUTHORIZED":
        return t("createErrorUnauthorized");
      case "FORBIDDEN":
        return t("createErrorForbidden");
      default:
        return t("createError");
    }
  }

  return (
    <form
      action={(formData) => {
        const data = Object.fromEntries(formData.entries()) as Record<string, string>;
        data.type = type;
        data.mode = mode;
        data.agendaItems = JSON.stringify(
          agendaItems
            .map((item) => ({
              title: item.title.trim(),
              description: item.description.trim() || null,
              status: "OPEN",
            }))
            .filter((item) => item.title.length > 0)
        );
        setFormError(null);
        startTransition(async () => {
          try {
            const result = await createMeeting(data, locale);
            if (result && "error" in result && result.error) {
              setFormError(mapCreateError(result.error));
            }
          } catch (err) {
            // Next.js redirect() throws; rethrow navigation errors
            const digest = (err as { digest?: string })?.digest;
            if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
              throw err;
            }
            // Some runtimes surface redirect without digest — ignore empty results
            if (err && typeof err === "object" && "message" in err) {
              const msg = String((err as { message: string }).message);
              if (msg.includes("NEXT_REDIRECT") || msg.includes("Redirect")) throw err;
            }
            setFormError(t("createError"));
          }
        });
      }}
      className="space-y-6"
    >
      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {formError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5" data-assist="meeting-form-mode">
            <label className="text-sm font-medium text-gray-700">{t("modeLabel")}</label>
            <div className="grid sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("now")}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  mode === "now"
                    ? "border-navy bg-navy/5 ring-2 ring-navy/20"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <p className="font-medium text-sm text-gray-900">{t("modeNow")}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("modeNowHint")}</p>
              </button>
              <button
                type="button"
                onClick={() => setMode("scheduled")}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  mode === "scheduled"
                    ? "border-navy bg-navy/5 ring-2 ring-navy/20"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <p className="font-medium text-sm text-gray-900">{t("modeScheduled")}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("modeScheduledHint")}</p>
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {mode === "scheduled" && (
              <div data-assist="meeting-form-date">
                <Input
                  name="date"
                  type="date"
                  label={t("date")}
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
            )}
            <div className="space-y-1.5" data-assist="meeting-form-type">
              <label className="text-sm font-medium text-gray-700">{t("type")}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                {MEETING_TYPES.map((mt) => (
                  <option key={mt} value={mt}>
                    {t(`types.${mt}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div data-assist="meeting-form-location">
            <Input name="location" label={t("location")} defaultValue={defaults.location} />
          </div>

          {mode === "scheduled" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                name="startTime"
                type="time"
                label={t("startTime")}
                defaultValue={defaults.startTime}
              />
              <Input name="endTime" type="time" label={t("endTime")} />
            </div>
          )}

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

      <Card data-assist="meeting-form-agenda">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{t("agenda")}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{t("agendaHint")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAgendaItem}
            disabled={agendaLoading}
          >
            <Plus className="h-4 w-4" />
            {t("addAgendaItem")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {agendaLoading && agendaItems.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">{t("agendaLoading")}</p>
          ) : agendaItems.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">{t("agendaEmpty")}</p>
          ) : (
            agendaItems.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-300 shrink-0" aria-hidden />
                  <span className="text-xs font-medium text-gray-400">
                    {tMinutes("agendaItem")} {index + 1}
                  </span>
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAgendaItem(item.id)}
                    disabled={agendaItems.length <= 1}
                    className="text-gray-400 hover:text-red-600"
                    aria-label={t("removeAgendaItem")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  label={tMinutes("agendaItem")}
                  value={item.title}
                  onChange={(e) => updateAgendaItem(item.id, "title", e.target.value)}
                  placeholder={t("agendaItemPlaceholder")}
                  required
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {t("agendaDescription")}
                  </label>
                  <textarea
                    value={item.description}
                    onChange={(e) => updateAgendaItem(item.id, "description", e.target.value)}
                    rows={2}
                    placeholder={t("agendaDescriptionPlaceholder")}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              </div>
            ))
          )}
          {agendaLoading && agendaItems.length > 0 && (
            <p className="text-xs text-gray-400">{t("agendaLoading")}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3" data-assist="meeting-form-submit">
        <Button type="submit" variant="gold" disabled={pending || agendaLoading}>
          {pending ? "..." : mode === "now" ? t("startNow") : t("scheduleMeeting")}
        </Button>
      </div>
    </form>
  );
}
