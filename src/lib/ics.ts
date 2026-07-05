import type { Meeting } from "@/generated/prisma/client";

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateMeetingIcs(meeting: {
  id: string;
  title?: string | null;
  date: Date;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  clubName: string;
}): string {
  const start = new Date(meeting.date);
  if (meeting.startTime) {
    const [h, m] = meeting.startTime.split(":").map(Number);
    start.setHours(h ?? 12, m ?? 0, 0, 0);
  }
  const end = new Date(start);
  if (meeting.endTime) {
    const [h, m] = meeting.endTime.split(":").map(Number);
    end.setHours(h ?? 14, m ?? 0, 0, 0);
  } else {
    end.setHours(start.getHours() + 2);
  }

  const summary = escapeIcs(meeting.title ?? `Réunion ${meeting.clubName}`);
  const location = escapeIcs(meeting.location ?? "");
  const uid = `${meeting.id}@rotaryminutes.app`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rotary Minutes//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${summary}`,
    location ? `LOCATION:${location}` : "",
    `DESCRIPTION:Réunion Rotary — ${escapeIcs(meeting.clubName)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function icsAttachment(meeting: Parameters<typeof generateMeetingIcs>[0]) {
  const content = generateMeetingIcs(meeting);
  const slug = (meeting.title ?? "reunion").replace(/\s+/g, "-").toLowerCase();
  return { filename: `${slug}.ics`, content };
}