"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateMeeting } from "@/actions/meetings";
import { toLocalDateInputValue } from "@/lib/local-date";
import {
  OfficerSelect,
  type OfficerMemberOption,
} from "@/components/meetings/officer-select";

export function MeetingDetailsEditor({
  meetingId,
  initial,
  members = [],
  canEdit,
  lockedHint = false,
}: {
  meetingId: string;
  initial: {
    title?: string | null;
    date: Date | string;
    location?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    presidedBy?: string | null;
    secretary?: string | null;
  };
  members?: OfficerMemberOption[];
  canEdit: boolean;
  /** Show override banner (president/admin on locked PV). */
  lockedHint?: boolean;
}) {
  const t = useTranslations("meetings");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [title, setTitle] = useState(initial.title ?? "");
  const [date, setDate] = useState(toLocalDateInputValue(initial.date));
  const [location, setLocation] = useState(initial.location ?? "");
  const [startTime, setStartTime] = useState(initial.startTime ?? "");
  const [endTime, setEndTime] = useState(initial.endTime ?? "");
  const [presidedBy, setPresidedBy] = useState(initial.presidedBy ?? "");
  const [secretary, setSecretary] = useState(initial.secretary ?? "");

  if (!canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "fr"
              ? "Détails de la réunion"
              : locale === "es"
                ? "Detalles de la reunión"
                : "Meeting details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-500">{t("date")}</span>
            <p className="font-medium">{date || "—"}</p>
          </div>
          <div>
            <span className="text-gray-500">{t("location")}</span>
            <p className="font-medium">{location || "—"}</p>
          </div>
          <div>
            <span className="text-gray-500">{t("presidedBy")}</span>
            <p className="font-medium">{presidedBy || "—"}</p>
          </div>
          <div>
            <span className="text-gray-500">{t("secretary")}</span>
            <p className="font-medium">{secretary || "—"}</p>
          </div>
          <div>
            <span className="text-gray-500">{t("startTime")}</span>
            <p className="font-medium">{startTime || "—"}</p>
          </div>
          <div>
            <span className="text-gray-500">{t("endTime")}</span>
            <p className="font-medium">{endTime || "—"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateMeeting(
        meetingId,
        {
          title: title || null,
          date,
          location,
          startTime,
          endTime,
          presidedBy,
          secretary,
        },
        locale
      );
      if (result && "error" in result && result.error) {
        setError(
          result.error === "LOCKED"
            ? locale === "fr"
              ? "Cette réunion est liée à un PV verrouillé."
              : "This meeting is linked to a locked minute."
            : locale === "fr"
              ? "Impossible d'enregistrer les détails."
              : "Could not save meeting details."
        );
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle>
            {locale === "fr"
              ? "Détails de la réunion"
              : locale === "es"
                ? "Detalles de la reunión"
                : "Meeting details"}
          </CardTitle>
          {lockedHint ? (
            <p className="text-xs text-amber-700">
              {locale === "fr"
                ? "Modification exceptionnelle (président / admin)"
                : locale === "es"
                  ? "Edición excepcional (presidente / admin)"
                  : "Override edit (president / admin)"}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={pending}
        >
          <Save className="h-4 w-4" />
          {pending ? "…" : tCommon("save")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-sm text-emerald-700">
            {locale === "fr" ? "Détails enregistrés." : "Details saved."}
          </p>
        ) : null}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label={t("date")}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label={t("startTime")}
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            label={t("endTime")}
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
          <Input
            label={t("location")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <OfficerSelect
            id="meeting-presided-by"
            label={t("presidedBy")}
            value={presidedBy}
            onChange={setPresidedBy}
            members={members}
          />
          <OfficerSelect
            id="meeting-secretary"
            label={t("secretary")}
            value={secretary}
            onChange={setSecretary}
            members={members}
          />
        </div>
      </CardContent>
    </Card>
  );
}
