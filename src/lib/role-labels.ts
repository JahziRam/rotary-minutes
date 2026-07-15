import { ROLE_LABELS } from "@/lib/role-definitions";
import type { ClubRoleType } from "@/lib/rotary";

export function resolveRoleLocale(locale: string): "fr" | "en" | "es" {
  if (locale === "fr") return "fr";
  if (locale === "es") return "es";
  return "en";
}

export function getRoleLabel(role: ClubRoleType, locale: string): string {
  const loc = resolveRoleLocale(locale);
  const labels = ROLE_LABELS[role];
  return labels[loc];
}