import { prisma } from "@/lib/prisma";

/** Préférence push : activée par défaut si aucune ligne en base. */
export async function isWebPushEnabledForUser(
  userId: string,
  clubId: string | null | undefined
): Promise<boolean> {
  if (!clubId) return false;

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { webPushEnabled: true },
  });

  return prefs?.webPushEnabled ?? true;
}

export async function setWebPushEnabledForUser(
  userId: string,
  clubId: string,
  enabled: boolean
): Promise<void> {
  await prisma.notificationPreference.upsert({
    where: { userId_clubId: { userId, clubId } },
    create: {
      userId,
      clubId,
      webPushEnabled: enabled,
    },
    update: { webPushEnabled: enabled },
  });
}

/** True once the member has explicitly chosen Garder / Désactiver for push. */
export async function hasPushOnboardingDecision(
  userId: string,
  clubId: string | null | undefined
): Promise<boolean> {
  if (!clubId) return true;

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { id: true },
  });

  return !!prefs;
}