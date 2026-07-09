/** WhatsApp reminder links (wa.me) — no API key required for basic reminders. */

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}

export function meetingReminderWhatsAppMessage(opts: {
  clubName: string;
  meetingTitle: string;
  dateStr: string;
  location?: string | null;
  checkInUrl?: string | null;
  locale: string;
}): string {
  const isFr = opts.locale !== "en";
  const loc = opts.location ? (isFr ? `\n📍 ${opts.location}` : `\n📍 ${opts.location}`) : "";
  const checkIn = opts.checkInUrl
    ? (isFr ? `\n✅ Check-in : ${opts.checkInUrl}` : `\n✅ Check-in: ${opts.checkInUrl}`)
    : "";
  return isFr
    ? `Bonjour,\n\nRappel : réunion *${opts.clubName}* — ${opts.meetingTitle}\n📅 ${opts.dateStr}${loc}${checkIn}\n\nÀ bientôt !`
    : `Hello,\n\nReminder: *${opts.clubName}* meeting — ${opts.meetingTitle}\n📅 ${opts.dateStr}${loc}${checkIn}\n\nSee you soon!`;
}