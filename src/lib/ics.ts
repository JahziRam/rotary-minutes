export {
  generateMeetingIcs,
  icsAttachment,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  type CalendarMeetingInput,
} from "@/lib/calendar-ics";

import type { UnifiedCalendarEvent } from "@/lib/queries/calendar";

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateUnifiedCalendarIcs(
  events: UnifiedCalendarEvent[],
  calendarName: string
): string {
  const vevents = events.map((event) => {
    const start = event.startAt;
    const end = event.endAt ?? new Date(start.getTime() + 60 * 60 * 1000);
    const uid = `${event.id}@rotaryminutes.app`;
    const summary = escapeIcs(event.title);
    const description = escapeIcs(event.description ?? "");
    const categories = escapeIcs(event.source);

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : "",
      `CATEGORIES:${categories}`,
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rotary Minutes//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}