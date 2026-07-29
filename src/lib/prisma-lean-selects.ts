/**
 * Shared Prisma `select` fragments that avoid loading large TEXT blobs
 * (photoUrl / logoUrl / fileUrl data URLs) into Node memory.
 */

/** Club fields for emails/crons — never logoUrl (use /api/media/club/[id]/logo). */
export const leanClubForEmailSelect = {
  id: true,
  name: true,
  language: true,
} as const;

/** Absolute media URL for club logo (HTTP, not a DB blob). */
export function clubLogoHttpUrl(clubId: string, baseUrl: string): string {
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}/api/media/club/${clubId}/logo`;
}

/** Member list card — identity only. */
export const leanMemberIdentitySelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  userId: true,
} as const;
