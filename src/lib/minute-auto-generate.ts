import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  buildMinuteAttendanceAnnex,
  MEMBER_ATTENDANCE_CATEGORIES,
  type MinuteAttendanceRow,
} from "@/lib/minute-attendance-annex";

type AgendaItemInput = {
  id: string;
  title: string;
  description?: string | null;
  decisions?: string | null;
  actions?: string | null;
};

type MeetingInput = {
  date: Date;
  location?: string | null;
  type: string;
  presidedBy?: string | null;
  secretary?: string | null;
  attendances: MinuteAttendanceRow[];
};

export function buildAutoMinuteFreeText(meeting: MeetingInput, locale: string): string {
  const dateLocale = locale === "en" ? enUS : fr;
  const annex = buildMinuteAttendanceAnnex(meeting.attendances, locale);
  const dateStr = format(meeting.date, "d MMMM yyyy", { locale: dateLocale });
  const isFr = locale !== "en";

  const lines = [
    isFr
      ? `Procès-verbal de la réunion du ${dateStr}${meeting.location ? ` à ${meeting.location}` : ""}.`
      : `Minutes of the meeting held on ${dateStr}${meeting.location ? ` at ${meeting.location}` : ""}.`,
    meeting.presidedBy
      ? (isFr ? `Présidence : ${meeting.presidedBy}` : `Presided by: ${meeting.presidedBy}`)
      : null,
    meeting.secretary
      ? (isFr ? `Secrétariat : ${meeting.secretary}` : `Secretary: ${meeting.secretary}`)
      : null,
    "",
    isFr ? "Synthèse des présences :" : "Attendance summary:",
    ...annex.memberGroups.map((g) => `• ${g.label} : ${g.names.length}`),
    annex.visitors.length > 0
      ? (isFr
          ? `• Visiteurs : ${annex.visitors.map((v) => v.name).join(", ")}`
          : `• Visitors: ${annex.visitors.map((v) => v.name).join(", ")}`)
      : null,
    "",
    isFr
      ? "Les listes détaillées figurent en annexe du PV."
      : "Detailed lists are included in the minutes annex.",
  ].filter(Boolean);

  return lines.join("\n");
}

export function enrichAgendaFromMeeting(
  items: AgendaItemInput[],
  meeting: MeetingInput,
  locale: string
): AgendaItemInput[] {
  const isFr = locale !== "en";
  const annex = buildMinuteAttendanceAnnex(meeting.attendances, locale);
  const attendanceSummary = annex.memberGroups
    .map((g) => `${g.label}: ${g.names.join(", ")}`)
    .join("\n");

  return items.map((item) => {
    const titleLower = item.title.toLowerCase();
    const isAttendanceItem =
      titleLower.includes("présence") ||
      titleLower.includes("presence") ||
      titleLower.includes("assiduité") ||
      titleLower.includes("attendance");

    if (isAttendanceItem && !item.decisions?.trim()) {
      return {
        ...item,
        decisions: attendanceSummary || (isFr ? "Feuille de présence enregistrée." : "Attendance sheet recorded."),
      };
    }

    if (
      (titleLower.includes("visiteur") || titleLower.includes("visitor") || titleLower.includes("invité")) &&
      !item.decisions?.trim() &&
      annex.visitors.length > 0
    ) {
      return {
        ...item,
        decisions: annex.visitors.map((v) => `${v.name} (${v.label})`).join("\n"),
      };
    }

    return item;
  });
}

export function countMemberAttendances(rows: MinuteAttendanceRow[]) {
  return rows.filter((r) =>
    (MEMBER_ATTENDANCE_CATEGORIES as readonly string[]).includes(r.category)
  ).length;
}