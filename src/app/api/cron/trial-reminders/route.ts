import { NextResponse } from "next/server";
import { addDays, differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendEmail, trialReminderEmail } from "@/lib/email";
const REMINDER_DAYS = [7, 3, 1] as const;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let sent = 0;

  const trialing = await prisma.subscription.findMany({
    where: { status: "TRIALING", trialEndsAt: { gt: now } },
    include: {
      club: {
        include: {
          memberships: {
            where: { role: { in: ["ADMIN", "PRESIDENT"] }, isActive: true },
            include: { user: true },
            take: 3,
          },
        },
      },
    },
  });

  for (const sub of trialing) {
    if (!sub.trialEndsAt) continue;
    const daysLeft = differenceInCalendarDays(sub.trialEndsAt, now);
    if (!REMINDER_DAYS.includes(daysLeft as (typeof REMINDER_DAYS)[number])) continue;

    const locale =
      sub.club.language === "EN" ? "en" : sub.club.language === "ES" ? "es" : "fr";
    const mail = await trialReminderEmail({
      clubName: sub.club.name,
      clubId: sub.club.id,
      daysLeft,
      locale,
      upgradeUrl: `${baseUrl}/${locale}/settings/subscription`,
      logoUrl: sub.club.logoUrl ?? undefined,
    });

    for (const m of sub.club.memberships) {
      const result = await sendEmail({
        to: m.user.email,
        subject: mail.subject,
        html: mail.html,
        attachments: mail.attachments,
      });
      if (result.ok) sent++;
    }
  }

  return NextResponse.json({ sent, checkedAt: now.toISOString(), windowEnd: addDays(now, 8) });
}