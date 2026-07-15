import type { ClubAnnouncementTarget, ClubRole } from "@/generated/prisma/client";
import { resolveClubAnnouncementDelivery } from "@/lib/club-announcement-delivery";

export async function resolveClubAnnouncementRecipients(opts: {
  clubId: string;
  targetType: ClubAnnouncementTarget;
  targetRoles: ClubRole[];
  targetCommissionId?: string | null;
}): Promise<string[]> {
  const delivery = await resolveClubAnnouncementDelivery(opts);
  return delivery.userIds;
}

export { resolveClubAnnouncementDelivery } from "@/lib/club-announcement-delivery";