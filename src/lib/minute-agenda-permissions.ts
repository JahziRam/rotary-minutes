/**
 * Who may remove agenda items (ordres du jour) from a minute.
 * President, secretary, club admin, and platform super admin.
 */
export function canDeleteMinuteAgendaItems(ctx: {
  isSuperAdmin: boolean;
  role: string;
}): boolean {
  if (ctx.isSuperAdmin) return true;
  return (
    ctx.role === "PRESIDENT" ||
    ctx.role === "SECRETARY" ||
    ctx.role === "ADMIN"
  );
}
