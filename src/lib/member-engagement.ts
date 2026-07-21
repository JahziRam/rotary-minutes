import { prisma } from "@/lib/prisma";

/** Record successful login timestamp (fire-and-forget safe). */
export async function recordUserLogin(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  } catch (e) {
    console.error("[engagement] recordUserLogin failed", userId, e);
  }
}

/**
 * Record or refresh a minute open for a user.
 * Throttled: only bumps viewedAt if last view was more than 30 minutes ago.
 */
export async function recordMinuteView(opts: {
  clubId: string;
  minuteId: string;
  userId: string;
}): Promise<void> {
  try {
    const existing = await prisma.minuteView.findUnique({
      where: {
        minuteId_userId: {
          minuteId: opts.minuteId,
          userId: opts.userId,
        },
      },
      select: { id: true, viewedAt: true },
    });

    const throttleMs = 30 * 60 * 1000;
    if (
      existing &&
      Date.now() - existing.viewedAt.getTime() < throttleMs
    ) {
      return;
    }

    await prisma.minuteView.upsert({
      where: {
        minuteId_userId: {
          minuteId: opts.minuteId,
          userId: opts.userId,
        },
      },
      create: {
        clubId: opts.clubId,
        minuteId: opts.minuteId,
        userId: opts.userId,
        viewedAt: new Date(),
      },
      update: {
        viewedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[engagement] recordMinuteView failed", opts, e);
  }
}
