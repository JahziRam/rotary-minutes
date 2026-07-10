import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const DEFAULT_APP_NAME = "Rotary Minutes";

export type AppBranding = {
  appName: string;
  tagline: string | null;
};

export const getAppSettings = cache(async () => {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "global" },
    select: {
      appName: true,
      tagline: true,
      supportEmail: true,
      trialDays: true,
      maintenanceMode: true,
    },
  });

  return {
    appName: settings?.appName?.trim() || DEFAULT_APP_NAME,
    tagline: settings?.tagline?.trim() || null,
    supportEmail: settings?.supportEmail?.trim() || null,
    trialDays: settings?.trialDays ?? 14,
    maintenanceMode: settings?.maintenanceMode ?? false,
  };
});

export const getAppBranding = cache(async (): Promise<AppBranding> => {
  const settings = await getAppSettings();
  return {
    appName: settings.appName,
    tagline: settings.tagline,
  };
});

export async function getAppName(): Promise<string> {
  const { appName } = await getAppBranding();
  return appName;
}

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