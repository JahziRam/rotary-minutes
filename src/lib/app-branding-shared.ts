/**
 * Client-safe branding helpers (no Prisma / Node-only imports).
 * Server DB access lives in app-settings.ts.
 */

export const DEFAULT_APP_NAME = "Rotary Minutes";

export type AppBranding = {
  appName: string;
  tagline: string | null;
};

/** Splits "Rotary Minutes" → { lead: "Rotary", accent: "Minutes" } for styled wordmarks */
export function splitAppBrandName(name: string): { lead: string; accent: string | null } {
  const trimmed = name.trim();
  const space = trimmed.indexOf(" ");
  if (space <= 0) return { lead: trimmed, accent: null };
  return {
    lead: trimmed.slice(0, space),
    accent: trimmed.slice(space + 1),
  };
}
