import { DEFAULT_APP_NAME } from "@/lib/app-branding-shared";

function icsProdId(appName: string = DEFAULT_APP_NAME): string {
  return `PRODID:-//${appName}//FR`;
}

export interface CalendarMeetingInput {
  id: string;
  title?: string | null;
  date: Date;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  clubName: string;
  description?: string | null;
}

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

function resolveEventTimes(meeting: CalendarMeetingInput): { start: Date; end: Date } {
  const start = new Date(meeting.date);
  if (meeting.startTime) {
    const [h, m] = meeting.startTime.split(":").map(Number);
    start.setHours(h ?? 12, m ?? 0, 0, 0);
  } else {
    start.setHours(12, 0, 0, 0);
  }

  const end = new Date(start);
  if (meeting.endTime) {
    const [h, m] = meeting.endTime.split(":").map(Number);
    end.setHours(h ?? 14, m ?? 0, 0, 0);
  } else {
    end.setHours(start.getHours() + 2);
  }

  return { start, end };
}

export function generateMeetingIcs(
  meeting: CalendarMeetingInput,
  appName: string = DEFAULT_APP_NAME
): string {
  const { start, end } = resolveEventTimes(meeting);
  const summary = escapeIcs(meeting.title ?? `Réunion ${meeting.clubName}`);
  const location = escapeIcs(meeting.location ?? "");
  const description = escapeIcs(
    meeting.description ?? `Réunion Rotary — ${meeting.clubName}`
  );
  const uid = `${meeting.id}@rotaryminutes.app`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    icsProdId(appName),
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${summary}`,
    location ? `LOCATION:${location}` : "",
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function buildGoogleCalendarUrl(meeting: CalendarMeetingInput): string {
  const { start, end } = resolveEventTimes(meeting);
  const text = meeting.title ?? `Réunion ${meeting.clubName}`;
  const dates = `${formatIcsDate(start)}/${formatIcsDate(end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text,
    dates,
    details: meeting.description ?? `Réunion Rotary — ${meeting.clubName}`,
    location: meeting.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(meeting: CalendarMeetingInput): string {
  const { start, end } = resolveEventTimes(meeting);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    subject: meeting.title ?? `Réunion ${meeting.clubName}`,
    location: meeting.location ?? "",
    body: meeting.description ?? `Réunion Rotary — ${meeting.clubName}`,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function icsAttachment(meeting: CalendarMeetingInput) {
  const content = generateMeetingIcs(meeting);
  const slug = (meeting.title ?? "reunion").replace(/\s+/g, "-").toLowerCase();
  return { filename: `${slug}.ics`, content };
}

export function generateClubCalendarIcs(
  clubName: string,
  meetings: CalendarMeetingInput[],
  appName: string = DEFAULT_APP_NAME
): string {
  const events = meetings.map((meeting) => {
    const { start, end } = resolveEventTimes(meeting);
    const summary = escapeIcs(meeting.title ?? `Réunion ${clubName}`);
    const location = escapeIcs(meeting.location ?? "");
    const description = escapeIcs(
      meeting.description ?? `Réunion Rotary — ${clubName}`
    );
    const uid = `${meeting.id}@rotaryminutes.app`;
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${summary}`,
      location ? `LOCATION:${location}` : "",
      `DESCRIPTION:${description}`,
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    icsProdId(appName),
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(clubName)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}