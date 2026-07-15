/** Actions visibles dans le journal d'activité club (président / admin). */
export const CLUB_ACTIVITY_ACTIONS = [
  "MEMBER_CREATED",
  "MEMBER_LOGIN_SENT",
  "MEMBERSHIP_APPROVED",
  "MEMBERSHIP_REJECTED",
  "MEMBER_ROLE_UPDATED",
  "CLUB_USER_INVITED",
  "CLUB_USER_ROLE_UPDATED",
  "CLUB_USER_REMOVED",
] as const;

export type ClubActivityAction = (typeof CLUB_ACTIVITY_ACTIONS)[number];

export function canViewClubActivity(role: string, isSuperAdmin: boolean): boolean {
  if (isSuperAdmin) return true;
  return role === "PRESIDENT" || role === "VICE_PRESIDENT" || role === "ADMIN";
}