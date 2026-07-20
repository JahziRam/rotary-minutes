/**
 * Minutes content is locked for most roles once in REVIEW / FINALIZED / ARCHIVED.
 * Club president, club admin, and platform super admin may still edit
 * (corrections after diffusion/archive).
 */

export const MINUTE_LOCKED_STATUSES = ["FINALIZED", "ARCHIVED", "REVIEW"] as const;

export type MinuteLockStatus = (typeof MINUTE_LOCKED_STATUSES)[number];

const OVERRIDE_ROLES = new Set(["PRESIDENT", "ADMIN"]);

export function isMinuteContentLocked(status: string): boolean {
  return (MINUTE_LOCKED_STATUSES as readonly string[]).includes(status);
}

/** Club president, club admin, or platform super admin may edit locked minutes. */
export function canOverrideMinuteLock(ctx: {
  isSuperAdmin: boolean;
  role: string;
}): boolean {
  return ctx.isSuperAdmin || OVERRIDE_ROLES.has(ctx.role);
}

/**
 * Returns a LOCKED error when the minute cannot be edited by this actor.
 * Returns null when the edit is allowed.
 */
export function assertMinuteEditable(
  status: string,
  ctx: { isSuperAdmin: boolean; role: string }
): { error: "LOCKED" } | null {
  if (!isMinuteContentLocked(status)) return null;
  if (canOverrideMinuteLock(ctx)) return null;
  return { error: "LOCKED" };
}
