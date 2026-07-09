import { createHash } from "crypto";
import { getAppBaseUrl } from "@/lib/app-url";

export function generateContentHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function generateMinuteHash(minute: {
  id: string;
  title: string;
  agendaItems: Array<{
    title: string;
    description?: string | null;
    decisions?: string | null;
    actions?: string | null;
  }>;
  meeting: {
    date: Date;
    location?: string | null;
    type: string;
  };
  attendances: Array<{
    category: string;
    guestName?: string | null;
    member?: { firstName: string; lastName: string } | null;
  }>;
}): string {
  const payload = JSON.stringify({
    id: minute.id,
    title: minute.title,
    date: minute.meeting.date.toISOString(),
    location: minute.meeting.location,
    type: minute.meeting.type,
    agenda: minute.agendaItems.map((a) => ({
      title: a.title,
      description: a.description,
      decisions: a.decisions,
      actions: a.actions,
    })),
    attendances: minute.attendances.map((a) => ({
      category: a.category,
      name: a.guestName?.trim()
        || (a.member ? `${a.member.firstName} ${a.member.lastName}`.trim() : null),
    })),
  });
  return generateContentHash(payload);
}

export function getVerifyUrl(
  hash: string,
  baseUrl?: string,
  locale: string = "fr"
): string {
  const origin = (baseUrl ?? getAppBaseUrl()).replace(/\/$/, "");
  return `${origin}/${locale}/verify/${hash}`;
}

/** Always use production URL from contentHash (stored verifyUrl may be stale). */
export function resolveMinuteVerifyUrl(
  minute: { contentHash?: string | null; verifyUrl?: string | null },
  locale: string = "fr"
): string | null {
  if (minute.contentHash) {
    return getVerifyUrl(minute.contentHash, getAppBaseUrl(), locale);
  }
  const stored = minute.verifyUrl?.trim();
  if (stored && !stored.includes("localhost")) return stored;
  return null;
}