import { prisma } from "@/lib/prisma";
import { isVapidConfigured, resolveVapid } from "@/lib/vapid-config";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: { TTL?: number }
  ) => Promise<unknown>;
};

let webPushModule: WebPushModule | null | undefined;

async function loadWebPush(): Promise<WebPushModule | null> {
  if (webPushModule !== undefined) return webPushModule;
  try {
    const mod = await import("web-push");
    webPushModule = mod.default ?? mod;
    return webPushModule;
  } catch {
    webPushModule = null;
    return null;
  }
}

export async function isWebPushConfigured(): Promise<boolean> {
  return isVapidConfigured();
}

export { getVapidPublicKey } from "@/lib/vapid-config";

async function ensureVapid(webpush: WebPushModule) {
  const { publicKey, privateKey, subject } = await resolveVapid();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<"sent" | "stub" | "failed"> {
  const webpush = await loadWebPush();
  if (!webpush || !(await isWebPushConfigured())) {
    console.info("[web-push] stub:", payload.title, payload.body);
    return "stub";
  }

  if (!(await ensureVapid(webpush))) return "stub";

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 3600 }
    );
    return "sent";
  } catch (err) {
    console.error("[web-push] send failed:", err);
    return "failed";
  }
}

export async function sendPushToUser(opts: {
  userId: string;
  clubId?: string;
  payload: PushPayload;
}): Promise<{ sent: number; failed: number; stub: number }> {
  const { isWebPushEnabledForUser } = await import("@/lib/push-preference");
  const pushAllowed = await isWebPushEnabledForUser(opts.userId, opts.clubId ?? null);
  if (!pushAllowed) {
    return { sent: 0, failed: 0, stub: 0 };
  }

  const subs = await prisma.pushSubscription.findMany({
    where: {
      userId: opts.userId,
      ...(opts.clubId ? { OR: [{ clubId: opts.clubId }, { clubId: null }] } : {}),
    },
  });

  let sent = 0;
  let failed = 0;
  let stub = 0;

  for (const sub of subs) {
    const result = await sendPushToSubscription(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      opts.payload
    );
    if (result === "sent") sent++;
    else if (result === "stub") stub++;
    else failed++;
  }

  return { sent, failed, stub };
}

function resolveMeetingStart(date: Date, startTime?: string | null): Date {
  const start = new Date(date);
  if (startTime) {
    const [h, m] = startTime.split(":").map(Number);
    start.setHours(h ?? 12, m ?? 0, 0, 0);
  }
  return start;
}

export async function sendMeetingPushReminders(): Promise<{
  meetings: number;
  pushes: number;
  failed: number;
  stub: number;
  checkedAt: string;
}> {
  const now = new Date();
  const scanStart = new Date(now.getTime() - 60 * 60 * 1000);
  const scanEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const candidates = await prisma.meeting.findMany({
    where: { date: { gte: scanStart, lte: scanEnd } },
    select: {
      id: true,
      clubId: true,
      title: true,
      date: true,
      startTime: true,
      club: { select: { id: true, name: true, language: true } },
    },
  });

  const meetings = candidates.filter((meeting) => {
    const start = resolveMeetingStart(meeting.date, meeting.startTime);
    const minutesUntil = (start.getTime() - now.getTime()) / 60_000;
    return minutesUntil >= 50 && minutesUntil <= 70;
  });

  let pushes = 0;
  let failed = 0;
  let stub = 0;

  for (const meeting of meetings) {
    const locale = meeting.club.language === "EN" ? "en" : "fr";
    const memberships = await prisma.clubMembership.findMany({
      where: { clubId: meeting.clubId, isActive: true },
      select: { userId: true },
    });

    const title =
      locale === "fr" ? "Réunion dans 1 heure" : "Meeting in 1 hour";
    const body =
      locale === "fr"
        ? `${meeting.club.name} — ${meeting.title ?? "Réunion"}`
        : `${meeting.club.name} — ${meeting.title ?? "Meeting"}`;

    for (const m of memberships) {
      const result = await sendPushToUser({
        userId: m.userId,
        clubId: meeting.clubId,
        payload: {
          title,
          body,
          url: `/${locale}/meetings/${meeting.id}/attendance`,
          tag: `meeting-${meeting.id}`,
        },
      });
      pushes += result.sent + result.stub;
      failed += result.failed;
      stub += result.stub;
    }
  }

  return {
    meetings: meetings.length,
    pushes,
    failed,
    stub,
    checkedAt: now.toISOString(),
  };
}